-- ============================================================================
-- 0018: 2026 price list.
--
--   * hotel_plan enum + hotels.plan          the package a hotel is on
--                                            (accommodation | basic | professional
--                                             | advanced | enterprise); synced from
--                                            the Stripe price by the webhook.
--   * hotels.current_period_end              renewal date (mirrors businesses).
--   * launch offer ("first 50 hotels")       hotels.launch_offer_* columns plus
--                                            claim / release / remaining functions.
--   * commission cap                         create_partnership_request rejects
--                                            proposals above 10%.
--   * handle_new_user                        stops accepting the retired
--                                            'exclusive' plan from signup metadata.
--   hotels.subscription_tier is left in place (nothing reads it any more).
-- ============================================================================

do $$ begin
  create type hotel_plan as enum ('accommodation', 'basic', 'professional', 'advanced', 'enterprise');
exception when duplicate_object then null; end $$;

alter table hotels
  add column if not exists plan hotel_plan not null default 'basic',
  add column if not exists current_period_end timestamptz,
  add column if not exists launch_offer_applied boolean not null default false,
  add column if not exists launch_offer_rank integer,
  add column if not exists launch_offer_claimed_at timestamptz;

create unique index if not exists hotels_launch_offer_rank_key
  on hotels(launch_offer_rank) where launch_offer_rank is not null;

-- ===== Launch offer: first 50 hotels ========================================
-- A slot is claimed when the owner starts Checkout for an eligible package and
-- kept once the payment completes. The reconciler releases stale claims.

create or replace function public.claim_launch_offer(p_hotel_id uuid) returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_rank integer;
  v_taken integer;
begin
  perform pg_advisory_xact_lock(hashtext('launch_offer'));

  select launch_offer_rank into v_rank
  from hotels where id = p_hotel_id and launch_offer_applied;
  if v_rank is not null then
    return v_rank;
  end if;

  if not exists (select 1 from hotels where id = p_hotel_id) then
    return null;
  end if;

  select count(*) into v_taken from hotels where launch_offer_applied;
  if v_taken >= 50 then
    return null;
  end if;

  -- Smallest free rank in 1..50 (released claims leave holes).
  select min(r) into v_rank
  from generate_series(1, 50) as r
  where r not in (select launch_offer_rank from hotels where launch_offer_rank is not null);

  update hotels
  set launch_offer_applied = true,
      launch_offer_rank = v_rank,
      launch_offer_claimed_at = now()
  where id = p_hotel_id;

  return v_rank;
end;
$$;

-- Frees a claimed slot when the hotel never paid. Returns false when the
-- hotel is paying (the slot is theirs) or holds no claim.
create or replace function public.release_launch_offer(p_hotel_id uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_updated integer;
begin
  perform pg_advisory_xact_lock(hashtext('launch_offer'));
  update hotels
  set launch_offer_applied = false,
      launch_offer_rank = null,
      launch_offer_claimed_at = null
  where id = p_hotel_id
    and launch_offer_applied
    and billing_status not in ('active', 'past_due');
  get diagnostics v_updated = row_count;
  return v_updated > 0;
end;
$$;

create or replace function public.launch_offer_remaining() returns integer
language sql stable security definer set search_path = public as $$
  select greatest(0, 50 - (select count(*)::integer from hotels where launch_offer_applied));
$$;

revoke execute on function public.claim_launch_offer(uuid) from anon, authenticated, public;
revoke execute on function public.release_launch_offer(uuid) from anon, authenticated, public;
revoke execute on function public.launch_offer_remaining() from anon, authenticated, public;
grant execute on function public.claim_launch_offer(uuid) to service_role;
grant execute on function public.release_launch_offer(uuid) to service_role;
grant execute on function public.launch_offer_remaining() to service_role;

-- ===== Commission cap: up to 10% ===========================================
-- Same body as 0017 plus the cap on proposed commission. Existing partnerships
-- above 10% are left untouched (the admin list flags them).
create or replace function public.create_partnership_request(
  p_hotel_id uuid,
  p_business_id uuid,
  p_initiated_by connection_initiator,
  p_message text,
  p_commission numeric default null,
  p_offer text default null
) returns uuid
language plpgsql security definer set search_path = public, auth as $$
declare
  v_id uuid;
  v_existing partnership_requests%rowtype;
begin
  if auth.uid() is null then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;

  if p_initiated_by = 'hotel' then
    if not public.is_hotel_member(p_hotel_id) and not public.is_super_admin() then
      raise exception 'forbidden' using errcode = 'P0001';
    end if;
  else
    if not (public.is_business_owner(p_business_id) and public.is_approved_partner())
       and not public.is_super_admin() then
      raise exception 'forbidden' using errcode = 'P0001';
    end if;
  end if;

  if p_message is null or char_length(btrim(p_message)) < 1 then
    raise exception 'invalid_input' using errcode = 'P0001';
  end if;

  if p_commission is not null and (p_commission < 0 or p_commission > 10) then
    raise exception 'invalid_input' using errcode = 'P0001';
  end if;

  -- Both parties must be live: an active hotel and a listed business
  -- (active, verified and either paying or admin-exempt).
  if not exists (select 1 from hotels h where h.id = p_hotel_id and h.active)
     or not exists (select 1 from businesses b where b.id = p_business_id and b.listed) then
    raise exception 'target_unavailable' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from partnerships p
    where p.hotel_id = p_hotel_id and p.business_id = p_business_id and p.active
  ) then
    raise exception 'already_connected' using errcode = 'P0001';
  end if;

  select * into v_existing from partnership_requests r
  where r.hotel_id = p_hotel_id and r.business_id = p_business_id and r.status = 'pending'
  limit 1;
  if found then
    if v_existing.initiated_by <> p_initiated_by then
      raise exception 'reverse_pending' using errcode = 'P0001';
    end if;
    raise exception 'already_pending' using errcode = 'P0001';
  end if;

  insert into partnership_requests
    (hotel_id, business_id, initiated_by, requested_by, message, proposed_commission_pct, guest_offer)
  values
    (p_hotel_id, p_business_id, p_initiated_by, auth.uid(), btrim(p_message),
     p_commission, nullif(btrim(coalesce(p_offer, '')), ''))
  returning id into v_id;

  return v_id;
end;
$$;

-- ===== Signup trigger: only the two sold business tiers =====================
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public, auth as $$
declare
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_role account_role := case when m->>'role' = 'partner' then 'partner' else 'user' end;
  v_locale text := case when m->>'locale' in ('el', 'en') then m->>'locale' else 'el' end;
  v_plan subscription_tier := case
    when m->>'plan' in ('standard', 'featured') then (m->>'plan')::subscription_tier
    else null end;
  v_cat uuid;
  v_business uuid;
begin
  insert into profiles (id, role, display_name, locale, partner_status)
  values (
    new.id,
    v_role,
    nullif(trim(coalesce(m->>'display_name', '')), ''),
    v_locale,
    case when v_role = 'partner' then 'pending'::partner_status else null end
  )
  on conflict (id) do nothing;

  if v_role = 'partner' then
    begin
      v_cat := nullif(m->>'business_category_id', '')::uuid;
    exception when others then
      v_cat := null;
    end;
    if v_cat is not null and not exists (select 1 from business_categories where id = v_cat) then
      v_cat := null;
    end if;

    v_business := public.create_partner_listing(
      new.id,
      new.email,
      m->>'business_name',
      v_cat,
      m->>'business_phone',
      m->>'business_address',
      m->>'business_description',
      v_locale
    );

    insert into partner_applications
      (user_id, email, business_name, category_id, phone, address, description, locale, business_id, requested_tier)
    values (
      new.id,
      coalesce(new.email, ''),
      coalesce(nullif(trim(coalesce(m->>'business_name', '')), ''), 'Untitled'),
      v_cat,
      coalesce(m->>'business_phone', ''),
      coalesce(m->>'business_address', ''),
      nullif(trim(coalesce(m->>'business_description', '')), ''),
      v_locale,
      v_business,
      v_plan
    );
  end if;

  return new;
end;
$$;

-- ============================================================================
-- 0017: Business-level subscriptions, "listed" gate, billing audit tables.
--
--   * businesses         own the Stripe subscription (tier, status, period end,
--                        admin comp flag) and expose a stored `listed` column:
--                        active AND verified AND (exempt OR paying).
--                        Every public query and the RLS policy read `listed`,
--                        so "who is live" has exactly one definition.
--   * partnerships       stop being billed: active partnership subscriptions
--                        are moved onto their business. The tier column stays
--                        (informational / admin override) but is no longer
--                        the source of truth for ranking.
--   * partner_applications.requested_tier — plan chosen at signup.
--   * stripe_webhook_events gains error/attempt tracking; new table
--     billing_reconciliation_runs stores the nightly Stripe↔DB audit.
--   * Column grants: anon/authenticated could read every column of a live
--     business (stripe ids, billing email, webhook secret). Narrowed to the
--     public columns; admin/partner billing reads go through the service role.
-- ============================================================================

-- ===== businesses: billing columns + listed gate ============================
alter table businesses
  add column if not exists subscription_tier subscription_tier not null default 'free',
  add column if not exists billing_status billing_status not null default 'unbilled',
  add column if not exists stripe_subscription_id text,
  add column if not exists current_period_end timestamptz,
  add column if not exists billing_exempt boolean not null default false;

create unique index if not exists businesses_stripe_subscription_id_key
  on businesses(stripe_subscription_id) where stripe_subscription_id is not null;

alter table businesses
  add column if not exists listed boolean
  generated always as (
    active and verified and (billing_exempt or billing_status in ('active', 'past_due'))
  ) stored;
create index if not exists businesses_listed_idx on businesses(listed) where listed;

-- Admin-curated listings (everything not created by a partner signup) stay
-- free: they are editorial content, not customers.
update businesses
  set billing_exempt = true
  where not ('partner-owned' = any(tags));

-- Move any live partnership subscription onto the business. One subscription
-- per business from now on; the partnership keeps its status for history.
with src as (
  select distinct on (p.business_id)
    p.business_id, p.stripe_subscription_id, p.billing_status, p.subscription_tier
  from partnerships p
  where p.stripe_subscription_id is not null
  order by p.business_id, (p.billing_status = 'active') desc, p.updated_at desc
)
update businesses b
  set stripe_subscription_id = src.stripe_subscription_id,
      billing_status = src.billing_status,
      subscription_tier = case when src.billing_status in ('active', 'past_due')
                               then src.subscription_tier else 'free'::subscription_tier end
  from src
  where b.id = src.business_id and b.stripe_subscription_id is null;

update partnerships set stripe_subscription_id = null where stripe_subscription_id is not null;

-- ===== partner_applications: plan chosen at signup ===========================
alter table partner_applications
  add column if not exists requested_tier subscription_tier;

-- ===== stripe_webhook_events: failure tracking ==============================
alter table stripe_webhook_events
  add column if not exists error text,
  add column if not exists attempts integer not null default 0,
  add column if not exists last_error_at timestamptz;
create index if not exists stripe_webhook_events_unprocessed_idx
  on stripe_webhook_events(received_at) where processed_at is null;

-- ===== billing_reconciliation_runs ==========================================
create table if not exists billing_reconciliation_runs (
  id uuid primary key default gen_random_uuid(),
  ran_at timestamptz not null default now(),
  ok boolean not null,
  issue_count integer not null default 0,
  healed_count integer not null default 0,
  issues jsonb not null default '[]'::jsonb,
  summary jsonb not null default '{}'::jsonb
);
create index if not exists billing_reconciliation_runs_ran_at_idx on billing_reconciliation_runs(ran_at desc);
-- Service-role only: RLS on with no policies (matches stripe_webhook_events).
alter table billing_reconciliation_runs enable row level security;

-- ===== Signup trigger: store the requested plan (supersedes 0016) ===========
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public, auth as $$
declare
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_role account_role := case when m->>'role' = 'partner' then 'partner' else 'user' end;
  v_locale text := case when m->>'locale' in ('el', 'en') then m->>'locale' else 'el' end;
  v_plan subscription_tier := case
    when m->>'plan' in ('standard', 'featured', 'exclusive') then (m->>'plan')::subscription_tier
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

-- ===== RLS: public reads use the `listed` gate =============================
drop policy if exists businesses_read_active on businesses;
create policy businesses_read_active on businesses for select
  using (listed or public.is_super_admin());

-- ===== Column grants: hide billing/secret columns from client roles =========
-- Super-admin and partner pages that need billing columns read them through
-- the service role after their own authorization check.
revoke select on businesses from anon, authenticated;
grant select (
  id, name, category_id, description_i18n, lat, lng, address, phone, whatsapp, website,
  price_band, tags, opening_hours_json, images, verified, active, listed, created_at, updated_at
) on businesses to anon, authenticated;

-- ===== Partnership requests require a listed business =======================
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

-- ===== Audit trail for business billing changes ============================
-- The 0007 trigger function reads `hotel_id` as its first statement and bails
-- out through the `undefined_column` handler on tables that lack it — which
-- would make auditing `businesses` a silent no-op. Tolerate the missing column
-- per-field instead, so billing changes land in audit_log with hotel_id null.
create or replace function public.audit_changes() returns trigger
language plpgsql security definer set search_path = public, auth as $$
declare
  v_hotel uuid;
  v_actor uuid := auth.uid();
  v_diff jsonb;
begin
  begin
    if tg_op = 'DELETE' then
      v_hotel := (old).hotel_id;
    elsif tg_op = 'UPDATE' then
      v_hotel := coalesce((new).hotel_id, (old).hotel_id);
    else
      v_hotel := (new).hotel_id;
    end if;
  exception when undefined_column then
    v_hotel := null; -- table is not tenant-scoped (e.g. businesses)
  end;

  if tg_op = 'DELETE' then
    v_diff := jsonb_build_object('before', to_jsonb(old));
  elsif tg_op = 'UPDATE' then
    v_diff := jsonb_build_object('before', to_jsonb(old), 'after', to_jsonb(new));
  else
    v_diff := jsonb_build_object('after', to_jsonb(new));
  end if;

  insert into audit_log (hotel_id, actor_id, action, entity_type, entity_id, diff_jsonb)
  values (
    v_hotel,
    v_actor,
    tg_op,
    tg_table_name,
    coalesce((new).id, (old).id),
    v_diff
  );
  return coalesce(new, old);
exception
  -- Never let an audit failure block the underlying operation.
  when others then
    return coalesce(new, old);
end;
$$;

drop trigger if exists audit_changes_trg on businesses;
create trigger audit_changes_trg
  after insert or update or delete on businesses
  for each row execute function public.audit_changes();

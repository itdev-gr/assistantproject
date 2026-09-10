-- ============================================================================
-- 0016: Partner signup creates the business listing immediately.
--
--   * handle_new_user()   for role=partner now also inserts an unverified
--                         `businesses` row from the signup details, links the
--                         user in `business_owners` and stores the id on the
--                         partner application. The partner can complete the
--                         profile right away; approval = verifying the listing.
--   * backfill            pending applications without a listing get one.
--
-- The listing starts with a country-level placeholder pin and the
-- `needs-geocode` tag; the admin approval step geocodes the address.
-- ============================================================================

create or replace function public.create_partner_listing(
  p_user_id uuid,
  p_email text,
  p_business_name text,
  p_category_id uuid,
  p_phone text,
  p_address text,
  p_description text,
  p_locale text
) returns uuid
language plpgsql security definer set search_path = public, auth as $$
declare
  v_cat uuid := p_category_id;
  v_id uuid;
begin
  if v_cat is null or not exists (select 1 from business_categories where id = v_cat) then
    select id into v_cat from business_categories order by slug limit 1;
  end if;
  if v_cat is null then
    return null; -- no categories seeded yet; the admin approval path handles it
  end if;

  insert into businesses
    (name, category_id, description_i18n, lat, lng, address, phone, billing_email, tags, verified, active)
  values (
    coalesce(nullif(btrim(coalesce(p_business_name, '')), ''), 'Untitled'),
    v_cat,
    case when nullif(btrim(coalesce(p_description, '')), '') is null
      then '{}'::jsonb
      else jsonb_build_object(coalesce(p_locale, 'el'), btrim(p_description)) end,
    38.5, 23.5,
    coalesce(p_address, ''),
    nullif(btrim(coalesce(p_phone, '')), ''),
    nullif(btrim(coalesce(p_email, '')), ''),
    array['partner-owned', 'needs-geocode'],
    false,
    true
  )
  returning id into v_id;

  insert into business_owners (auth_user_id, business_id)
  values (p_user_id, v_id)
  on conflict do nothing;

  return v_id;
end;
$$;
revoke execute on function public.create_partner_listing(uuid, text, text, uuid, text, text, text, text)
  from anon, public, authenticated;

-- ===== Signup trigger (supersedes 0014) ====================================
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public, auth as $$
declare
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_role account_role := case when m->>'role' = 'partner' then 'partner' else 'user' end;
  v_locale text := case when m->>'locale' in ('el', 'en') then m->>'locale' else 'el' end;
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
      (user_id, email, business_name, category_id, phone, address, description, locale, business_id)
    values (
      new.id,
      coalesce(new.email, ''),
      coalesce(nullif(trim(coalesce(m->>'business_name', '')), ''), 'Untitled'),
      v_cat,
      coalesce(m->>'business_phone', ''),
      coalesce(m->>'business_address', ''),
      nullif(trim(coalesce(m->>'business_description', '')), ''),
      v_locale,
      v_business
    );
  end if;

  return new;
end;
$$;

-- ===== Backfill: pending applications that never got a listing ============
do $$
declare
  r record;
  v_id uuid;
begin
  for r in
    select a.id, a.user_id, a.email, a.business_name, a.category_id, a.phone, a.address, a.description, a.locale
    from partner_applications a
    where a.status = 'pending' and a.business_id is null
  loop
    v_id := public.create_partner_listing(
      r.user_id, r.email, r.business_name, r.category_id, r.phone, r.address, r.description, r.locale
    );
    if v_id is not null then
      update partner_applications set business_id = v_id where id = r.id;
    end if;
  end loop;
end$$;

-- Helper functions used by RLS policies. SECURITY DEFINER so policies can call
-- them without recursion through RLS itself.

create or replace function public.is_super_admin() returns boolean
language sql stable security definer set search_path = public, auth as $$
  select exists (select 1 from super_admins where auth_user_id = auth.uid());
$$;

create or replace function public.current_hotel_ids() returns setof uuid
language sql stable security definer set search_path = public, auth as $$
  select hotel_id from hotel_users where auth_user_id = auth.uid();
$$;

create or replace function public.is_hotel_member(h uuid) returns boolean
language sql stable security definer set search_path = public, auth as $$
  select exists (
    select 1 from hotel_users
    where auth_user_id = auth.uid() and hotel_id = h
  );
$$;

create or replace function public.is_hotel_owner(h uuid) returns boolean
language sql stable security definer set search_path = public, auth as $$
  select exists (
    select 1 from hotel_users
    where auth_user_id = auth.uid() and hotel_id = h and role = 'owner'
  );
$$;

-- Public-safe view for anonymous reads of hotel branding (slug → hotel_id resolution
-- happens here without leaking everything about the hotel).
create or replace view public.public_hotels as
  select id, slug, name, brand_json, default_locale, timezone
  from hotels
  where active = true;

grant select on public.public_hotels to anon, authenticated;
grant select on public.public_hotels to public;

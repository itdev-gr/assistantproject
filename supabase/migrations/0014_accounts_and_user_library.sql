-- ============================================================================
-- 0014: Self-serve accounts.
--
--   * profiles              1:1 with auth.users — account role (user|partner),
--                           display name, avatar, locale, partner status.
--   * partner_applications  "I own a business" requests, reviewed by super admins.
--   * business_owners       which auth user may edit which business.
--   * user_favorites / user_visits / user_recent_views — the visitor library.
--   * handle_new_user()     trigger on auth.users that seeds profiles (+ an
--                           application when the signup metadata says partner).
--   * custom_access_token_hook  now emits aga_role = user|partner for
--                           profile-only accounts (super_admin > hotel role > profile).
-- ============================================================================

-- ===== Enums ===============================================================
do $$ begin
  create type account_role as enum ('user', 'partner');
exception when duplicate_object then null; end $$;

do $$ begin
  create type partner_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type visit_source as enum ('manual', 'referral');
exception when duplicate_object then null; end $$;

-- ===== Tables ==============================================================
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role account_role not null default 'user',
  display_name text,
  avatar_url text,
  locale text not null default 'el' check (locale in ('el', 'en')),
  partner_status partner_status,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_partner_status_matches_role
    check ((role = 'partner') = (partner_status is not null))
);
drop trigger if exists set_updated_at on profiles;
create trigger set_updated_at before update on profiles
  for each row execute function set_updated_at();

create table if not exists partner_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null default '',
  business_name text not null,
  category_id uuid references business_categories(id) on delete set null,
  phone text not null default '',
  address text not null default '',
  description text,
  locale text not null default 'el',
  status partner_status not null default 'pending',
  business_id uuid references businesses(id) on delete set null,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now()
);
create index if not exists partner_applications_status_idx
  on partner_applications(status, created_at desc);
create unique index if not exists partner_applications_one_pending
  on partner_applications(user_id) where status = 'pending';

create table if not exists business_owners (
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  business_id uuid not null references businesses(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (auth_user_id, business_id)
);
create index if not exists business_owners_business_idx on business_owners(business_id);

create table if not exists user_favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  business_id uuid not null references businesses(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, business_id)
);

create table if not exists user_visits (
  user_id uuid not null references auth.users(id) on delete cascade,
  business_id uuid not null references businesses(id) on delete cascade,
  visited_at timestamptz not null default now(),
  source visit_source not null default 'manual',
  primary key (user_id, business_id)
);

create table if not exists user_recent_views (
  user_id uuid not null references auth.users(id) on delete cascade,
  business_id uuid not null references businesses(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (user_id, business_id)
);
create index if not exists user_recent_views_user_time
  on user_recent_views(user_id, viewed_at desc);

-- ===== Helper functions (same style as 0004) ===============================
create or replace function public.is_business_owner(b uuid) returns boolean
language sql stable security definer set search_path = public, auth as $$
  select exists (
    select 1 from business_owners
    where auth_user_id = auth.uid() and business_id = b
  );
$$;

create or replace function public.is_approved_partner() returns boolean
language sql stable security definer set search_path = public, auth as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'partner' and partner_status = 'approved'
  );
$$;

-- Upsert a "recently viewed" row for the caller and keep only the newest 50.
create or replace function public.record_recent_view(p_business_id uuid) returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then
    return;
  end if;
  insert into user_recent_views (user_id, business_id, viewed_at)
  values (auth.uid(), p_business_id, now())
  on conflict (user_id, business_id) do update set viewed_at = excluded.viewed_at;

  delete from user_recent_views
  where user_id = auth.uid()
    and business_id in (
      select business_id from user_recent_views
      where user_id = auth.uid()
      order by viewed_at desc
      offset 50
    );
end;
$$;
revoke execute on function public.record_recent_view(uuid) from anon, public;
grant execute on function public.record_recent_view(uuid) to authenticated;

-- ===== Signup trigger ======================================================
-- Reads the metadata passed as `options.data` to supabase.auth.signUp().
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public, auth as $$
declare
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_role account_role := case when m->>'role' = 'partner' then 'partner' else 'user' end;
  v_locale text := case when m->>'locale' in ('el', 'en') then m->>'locale' else 'el' end;
  v_cat uuid;
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

    insert into partner_applications
      (user_id, email, business_name, category_id, phone, address, description, locale)
    values (
      new.id,
      coalesce(new.email, ''),
      coalesce(nullif(trim(coalesce(m->>'business_name', '')), ''), 'Untitled'),
      v_cat,
      coalesce(m->>'business_phone', ''),
      coalesce(m->>'business_address', ''),
      nullif(trim(coalesce(m->>'business_description', '')), ''),
      v_locale
    );
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Existing accounts (invited hotel staff, super admins) get a plain profile so
-- the account area works for them too. The hook still prefers their real role.
insert into profiles (id, role)
select id, 'user' from auth.users
on conflict (id) do nothing;

-- ===== JWT hook: super_admin > hotel role > profile role ===================
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql stable security definer set search_path = public, auth as $$
declare
  v_user_id uuid := (event->>'user_id')::uuid;
  v_claims jsonb := coalesce(event->'claims', '{}'::jsonb);
  v_role text;
  v_hotel uuid;
  v_account text;
begin
  if exists (select 1 from public.super_admins where auth_user_id = v_user_id) then
    v_claims := v_claims || jsonb_build_object('aga_role', 'super_admin');
  else
    select role::text, hotel_id
      into v_role, v_hotel
    from public.hotel_users
    where auth_user_id = v_user_id
    order by created_at asc
    limit 1;

    if v_role is not null then
      v_claims := v_claims || jsonb_build_object('aga_role', v_role, 'hotel_id', v_hotel);
    else
      select role::text into v_account from public.profiles where id = v_user_id;
      v_claims := v_claims || jsonb_build_object('aga_role', coalesce(v_account, 'user'));
    end if;
  end if;

  return jsonb_set(event, '{claims}', v_claims);
end;
$$;

grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook(jsonb) from authenticated, anon, public;

-- ===== RLS =================================================================
alter table profiles enable row level security;
alter table partner_applications enable row level security;
alter table business_owners enable row level security;
alter table user_favorites enable row level security;
alter table user_visits enable row level security;
alter table user_recent_views enable row level security;

-- Super admins see and manage everything.
do $$
declare t text;
begin
  foreach t in array array[
    'profiles', 'partner_applications', 'business_owners',
    'user_favorites', 'user_visits', 'user_recent_views'
  ] loop
    execute format('drop policy if exists %1$s_super_admin_all on %1$s', t);
    execute format(
      'create policy %1$s_super_admin_all on %1$s for all using (public.is_super_admin()) with check (public.is_super_admin())',
      t
    );
  end loop;
end$$;

-- profiles: read/update self; role + partner_status are locked by column grants.
drop policy if exists profiles_self_select on profiles;
create policy profiles_self_select on profiles for select
  using (id = auth.uid());
drop policy if exists profiles_self_update on profiles;
create policy profiles_self_update on profiles for update
  using (id = auth.uid()) with check (id = auth.uid());
revoke update on profiles from authenticated, anon;
grant update (display_name, avatar_url, locale) on profiles to authenticated;

-- partner_applications: applicants read their own; writes are trigger/admin only.
drop policy if exists partner_applications_self_select on partner_applications;
create policy partner_applications_self_select on partner_applications for select
  using (user_id = auth.uid());

-- business_owners: read own links.
drop policy if exists business_owners_self_select on business_owners;
create policy business_owners_self_select on business_owners for select
  using (auth_user_id = auth.uid());

-- user library tables: full self-ownership.
do $$
declare t text;
begin
  foreach t in array array['user_favorites', 'user_visits', 'user_recent_views'] loop
    execute format('drop policy if exists %1$s_self_all on %1$s', t);
    execute format(
      'create policy %1$s_self_all on %1$s for all using (user_id = auth.uid()) with check (user_id = auth.uid())',
      t
    );
  end loop;
end$$;

-- businesses: owners may read their own row (even while unverified) and update
-- a whitelisted set of columns. Admin writes go through the service role, so
-- narrowing the `authenticated` grant does not affect them.
drop policy if exists businesses_owner_select on businesses;
create policy businesses_owner_select on businesses for select
  using (public.is_business_owner(id));
drop policy if exists businesses_owner_update on businesses;
create policy businesses_owner_update on businesses for update
  using (public.is_business_owner(id)) with check (public.is_business_owner(id));
revoke update on businesses from authenticated, anon;
grant update (name, description_i18n, phone, whatsapp, website, opening_hours_json, images, tags, price_band)
  on businesses to authenticated;

-- ===== Storage =============================================================
-- business-images: owners may manage files under "<businessId>/…".
drop policy if exists "business-images super-admin write" on storage.objects;
create policy "business-images super-admin write"
  on storage.objects for insert
  with check (
    bucket_id = 'business-images'
    and (
      public.is_super_admin()
      or public.is_business_owner(((storage.foldername(name))[1])::uuid)
    )
  );

drop policy if exists "business-images super-admin update" on storage.objects;
create policy "business-images super-admin update"
  on storage.objects for update
  using (
    bucket_id = 'business-images'
    and (
      public.is_super_admin()
      or public.is_business_owner(((storage.foldername(name))[1])::uuid)
    )
  );

drop policy if exists "business-images super-admin delete" on storage.objects;
create policy "business-images super-admin delete"
  on storage.objects for delete
  using (
    bucket_id = 'business-images'
    and (
      public.is_super_admin()
      or public.is_business_owner(((storage.foldername(name))[1])::uuid)
    )
  );

-- avatars: public read, each user manages "<uid>/…".
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatars public read" on storage.objects;
create policy "avatars public read"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "avatars self write" on storage.objects;
create policy "avatars self write"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars self update" on storage.objects;
create policy "avatars self update"
  on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars self delete" on storage.objects;
create policy "avatars self delete"
  on storage.objects for delete
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- ====== Tenancy ======

create table if not exists hotels (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  timezone text not null default 'Europe/Athens',
  lat double precision,
  lng double precision,
  default_locale text not null default 'el' check (default_locale in ('el','en')),
  subscription_tier subscription_tier not null default 'standard',
  brand_json jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists hotel_users (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references hotels(id) on delete cascade,
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  role hotel_role not null default 'owner',
  email text not null,
  created_at timestamptz not null default now(),
  unique (hotel_id, auth_user_id)
);
create index if not exists hotel_users_hotel_idx on hotel_users(hotel_id);
create index if not exists hotel_users_auth_idx on hotel_users(auth_user_id);

create table if not exists super_admins (
  auth_user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

-- ====== Property content ======

create table if not exists faqs (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references hotels(id) on delete cascade,
  locale text not null check (locale in ('el','en')),
  question text not null,
  answer text not null,
  tags text[] not null default '{}',
  intent_slug text,
  state publish_state not null default 'draft',
  version int not null default 1,
  search_tsv tsvector,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists faqs_hotel_idx on faqs(hotel_id, state);
create index if not exists faqs_intent_idx on faqs(hotel_id, intent_slug, state);
create index if not exists faqs_tags_gin on faqs using gin(tags);
create index if not exists faqs_tsv_gin on faqs using gin(search_tsv);

create or replace function faqs_tsv_trigger() returns trigger as $$
begin
  new.search_tsv :=
    setweight(to_tsvector(coalesce(new.locale,'simple')::regconfig, coalesce(new.question,'')), 'A') ||
    setweight(to_tsvector(coalesce(new.locale,'simple')::regconfig, coalesce(new.answer,'')), 'B');
  return new;
exception when others then
  -- fallback if locale is not a valid regconfig (Greek often isn't)
  new.search_tsv :=
    setweight(to_tsvector('simple', coalesce(new.question,'')), 'A') ||
    setweight(to_tsvector('simple', coalesce(new.answer,'')), 'B');
  return new;
end;
$$ language plpgsql;

drop trigger if exists faqs_tsv_update on faqs;
create trigger faqs_tsv_update before insert or update on faqs
  for each row execute function faqs_tsv_trigger();

create table if not exists amenities (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references hotels(id) on delete cascade,
  name text not null,
  description text,
  location_on_property text,
  hours_json jsonb not null default '{}'::jsonb,
  state publish_state not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists amenities_hotel_idx on amenities(hotel_id, state);

create table if not exists hours (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references hotels(id) on delete cascade,
  entity_type hours_entity_type not null,
  entity_ref uuid,
  weekday smallint not null check (weekday between 0 and 6),
  opens time not null,
  closes time not null,
  seasonal_start date,
  seasonal_end date,
  created_at timestamptz not null default now()
);
create index if not exists hours_lookup_idx on hours(hotel_id, entity_type, weekday);

create table if not exists policies (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references hotels(id) on delete cascade,
  kind policy_kind not null,
  body text not null,
  locale text not null check (locale in ('el','en')),
  state publish_state not null default 'draft',
  created_at timestamptz not null default now(),
  unique (hotel_id, kind, locale)
);

create table if not exists events_internal (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references hotels(id) on delete cascade,
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  capacity int,
  state publish_state not null default 'draft',
  created_at timestamptz not null default now()
);
create index if not exists events_internal_hotel_idx on events_internal(hotel_id, starts_at);

create table if not exists rooms (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references hotels(id) on delete cascade,
  code text not null,
  floor int,
  view text,
  wifi_password_secret text,
  notes text,
  created_at timestamptz not null default now(),
  unique (hotel_id, code)
);

-- ====== Guests & conversations ======

create table if not exists guest_sessions (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references hotels(id) on delete cascade,
  room_id uuid references rooms(id) on delete set null,
  device_fingerprint text,
  locale_detected text check (locale_detected in ('el','en')),
  meta_json jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
create index if not exists guest_sessions_hotel_idx on guest_sessions(hotel_id, last_seen_at);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references guest_sessions(id) on delete cascade,
  role message_role not null,
  content text not null,
  intent_slug text,
  retrieved_context_ids jsonb not null default '[]'::jsonb,
  needs_staff boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists messages_session_idx on messages(session_id, created_at);
create index if not exists messages_needs_staff_idx on messages(needs_staff) where needs_staff;

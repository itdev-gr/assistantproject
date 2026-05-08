-- ====== Partner network ======

create table if not exists business_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_i18n jsonb not null default '{}'::jsonb,
  parent_id uuid references business_categories(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category_id uuid not null references business_categories(id),
  description_i18n jsonb not null default '{}'::jsonb,
  lat double precision not null,
  lng double precision not null,
  address text not null,
  phone text,
  whatsapp text,
  website text,
  price_band smallint check (price_band between 1 and 4),
  tags text[] not null default '{}',
  opening_hours_json jsonb not null default '{}'::jsonb,
  images jsonb not null default '[]'::jsonb,
  search_tsv tsvector,
  verified boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists businesses_category_idx on businesses(category_id, active) where active;
create index if not exists businesses_tags_gin on businesses using gin(tags);
create index if not exists businesses_tsv_gin on businesses using gin(search_tsv);
create index if not exists businesses_geo_idx on businesses using gist(ll_to_earth(lat,lng));

create or replace function businesses_tsv_trigger() returns trigger as $$
begin
  new.search_tsv :=
    setweight(to_tsvector('simple', coalesce(new.name,'')), 'A') ||
    setweight(to_tsvector('simple', coalesce(new.description_i18n->>'el','') || ' ' || coalesce(new.description_i18n->>'en','')), 'B') ||
    setweight(to_tsvector('simple', array_to_string(coalesce(new.tags, '{}'), ' ')), 'C');
  return new;
end;
$$ language plpgsql;

drop trigger if exists businesses_tsv_update on businesses;
create trigger businesses_tsv_update before insert or update on businesses
  for each row execute function businesses_tsv_trigger();

create table if not exists business_offerings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  title text not null,
  description text,
  price_from numeric(10,2),
  price_to numeric(10,2),
  duration_minutes int,
  available_days smallint[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists offerings_business_idx on business_offerings(business_id, active);

create table if not exists partnerships (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references hotels(id) on delete cascade,
  business_id uuid not null references businesses(id) on delete cascade,
  commission_pct numeric(5,2) not null default 0 check (commission_pct between 0 and 100),
  paid_priority_score smallint not null default 0 check (paid_priority_score between 0 and 100),
  subscription_tier subscription_tier not null default 'free',
  contract_starts date,
  contract_ends date,
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (hotel_id, business_id)
);
create index if not exists partnerships_rank_idx
  on partnerships(hotel_id, active, subscription_tier, paid_priority_score desc);

-- ====== Revenue tracking ======

create table if not exists referrals (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references guest_sessions(id) on delete cascade,
  partnership_id uuid not null references partnerships(id) on delete cascade,
  offering_id uuid references business_offerings(id) on delete set null,
  shown_at timestamptz not null default now(),
  clicked_at timestamptz,
  expires_at timestamptz not null default (now() + interval '72 hours'),
  utm_json jsonb not null default '{}'::jsonb
);
create index if not exists referrals_partnership_idx on referrals(partnership_id, shown_at);
create index if not exists referrals_session_idx on referrals(session_id);

create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  referral_id uuid not null references referrals(id) on delete cascade,
  status booking_status not null default 'pending',
  gross_amount numeric(10,2),
  currency text not null default 'EUR',
  confirmed_at timestamptz,
  confirmation_source confirmation_source,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists bookings_status_idx on bookings(status, created_at);

create table if not exists commission_events (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  partnership_id uuid not null references partnerships(id) on delete cascade,
  commission_amount numeric(10,2) not null,
  payable_to text not null check (payable_to in ('platform','hotel')),
  state commission_state not null default 'accrued',
  created_at timestamptz not null default now()
);
create index if not exists commission_partnership_idx
  on commission_events(partnership_id, state, created_at);

-- ====== Configuration & ops ======

create table if not exists recommendation_rules (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid references hotels(id) on delete cascade,
  semantic_weight numeric(4,2) not null default 1.0,
  proximity_weight numeric(4,2) not null default 1.5,
  time_match_weight numeric(4,2) not null default 1.0,
  category_weight numeric(4,2) not null default 0.8,
  preference_weight numeric(4,2) not null default 0.5,
  partner_bias_weight numeric(4,2) not null default 0.5,
  distance_penalty_per_km numeric(4,3) not null default 0.05,
  proximity_scale_km numeric(4,2) not null default 2.0,
  tier_multipliers jsonb not null default '{"free":1.0,"standard":1.15,"featured":1.4,"exclusive":1.7}'::jsonb,
  max_results smallint not null default 5,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (hotel_id)
);

create table if not exists intents (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  description text,
  keywords_el text[] not null default '{}',
  keywords_en text[] not null default '{}',
  requires_partner_search boolean not null default false,
  is_out_of_scope boolean not null default false
);

create table if not exists feature_flags (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid references hotels(id) on delete cascade,
  flag text not null,
  enabled boolean not null default false,
  created_at timestamptz not null default now(),
  unique (hotel_id, flag)
);

create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid references hotels(id) on delete cascade,
  actor_id uuid,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  diff_jsonb jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_log_hotel_idx on audit_log(hotel_id, created_at);

-- updated_at triggers
create or replace function set_updated_at() returns trigger as $$
begin new.updated_at := now(); return new; end;
$$ language plpgsql;

do $$
declare t text;
begin
  for t in select unnest(array[
    'hotels','faqs','amenities','businesses','partnerships','bookings','recommendation_rules'
  ]) loop
    execute format('drop trigger if exists set_updated_at on %I', t);
    execute format('create trigger set_updated_at before update on %I for each row execute function set_updated_at()', t);
  end loop;
end$$;

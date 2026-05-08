-- Required extensions
create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";
create extension if not exists "earthdistance" cascade;

-- Enums
do $$ begin
  create type hotel_role as enum ('owner', 'manager', 'staff');
exception when duplicate_object then null; end $$;

do $$ begin
  create type subscription_tier as enum ('free', 'standard', 'featured', 'exclusive');
exception when duplicate_object then null; end $$;

do $$ begin
  create type message_role as enum ('guest', 'assistant', 'system');
exception when duplicate_object then null; end $$;

do $$ begin
  create type booking_status as enum ('pending', 'confirmed', 'cancelled', 'no_show');
exception when duplicate_object then null; end $$;

do $$ begin
  create type confirmation_source as enum ('partner_webhook', 'manual', 'self_reported');
exception when duplicate_object then null; end $$;

do $$ begin
  create type commission_state as enum ('accrued', 'invoiced', 'paid');
exception when duplicate_object then null; end $$;

do $$ begin
  create type policy_kind as enum ('pets', 'smoking', 'cancellation', 'payment', 'noise');
exception when duplicate_object then null; end $$;

do $$ begin
  create type hours_entity_type as enum (
    'reception','breakfast','lunch','dinner','pool','bar','spa','gym','checkin','checkout','amenity'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type publish_state as enum ('draft','published','archived');
exception when duplicate_object then null; end $$;

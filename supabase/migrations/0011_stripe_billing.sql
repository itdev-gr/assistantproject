-- Stripe billing: business tier subscriptions, commission invoicing, hotel plan
do $$ begin
  create type billing_status as enum ('unbilled', 'checkout_sent', 'active', 'past_due', 'canceled');
exception when duplicate_object then null; end $$;

alter table businesses add column if not exists billing_email text;
alter table businesses add column if not exists stripe_customer_id text unique;

alter table partnerships add column if not exists stripe_subscription_id text unique;
alter table partnerships add column if not exists billing_status billing_status not null default 'unbilled';

alter table hotels add column if not exists stripe_customer_id text unique;
alter table hotels add column if not exists stripe_subscription_id text unique;
alter table hotels add column if not exists billing_status billing_status not null default 'unbilled';

alter table commission_events add column if not exists stripe_invoice_id text;
create index if not exists commission_events_invoice_idx
  on commission_events(stripe_invoice_id) where stripe_invoice_id is not null;

create table if not exists stripe_webhook_events (
  id text primary key,           -- Stripe event id (evt_...)
  type text not null,
  payload jsonb not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);
-- Service-role only: RLS on with no policies (matches other internal tables)
alter table stripe_webhook_events enable row level security;

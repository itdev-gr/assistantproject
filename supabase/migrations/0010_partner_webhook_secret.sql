-- Per-business webhook secret. The platform shares this secret with the
-- partner; their booking-confirmation system signs every webhook body with it.
alter table businesses
  add column if not exists webhook_secret text;

create index if not exists businesses_webhook_secret_idx on businesses(webhook_secret)
  where webhook_secret is not null;

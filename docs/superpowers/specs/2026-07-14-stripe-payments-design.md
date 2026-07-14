# Stripe Payments — Design

**Date:** 2026-07-14 · **Status:** awaiting user review

## Why

The platform already *tracks* money (partnership subscription tiers, referral commissions with `accrued → invoiced → paid` states, EUR bookings) but nothing *moves* money. We are adding Stripe so revenue can actually be collected.

## Scope decision (phased)

The user asked for "a payment system using Stripe" (decision on what to charge first was made by recommendation — user was away; can be revised):

- **Phase 1 (this spec, build now): Business placement tiers.** Businesses pay a monthly subscription for their placement tier (Standard / Featured / Exclusive) in the directory and AI recommendations.
- **Phase 2 (designed, build later): Commission collection.** Monthly Stripe Invoices for accrued `commission_events`.
- **Phase 3 (sketched, build later): Hotel SaaS subscriptions.** Self-serve billing page in the owner dashboard.

Key structural fact driving the design: **businesses have no app logins** (only `hotel_users` and `super_admins` exist). So business payments cannot be self-serve inside the app. Instead, the **admin generates a Stripe-hosted checkout link** from the admin dashboard and sends it to the business; everything after that (payment, tier activation, renewals, failures) is automatic via webhooks.

## Phase 1 — Business placement tiers

### Money flow

1. Admin opens `/admin/partnerships`, picks a partnership, chooses a tier, clicks **Create payment link**.
2. Server creates (or reuses) a Stripe Customer for the business and a Stripe Checkout Session (subscription mode, monthly EUR price for that tier, `metadata: { partnershipId, tier }`). Link is shown to copy/send by email.
3. Business owner opens the link, pays on Stripe-hosted checkout (no login needed).
4. Stripe webhook `checkout.session.completed` → the partnership's `subscription_tier` is set, `billing_status = 'active'`. Featured/homepage/AI ranking pick this up automatically (they already read `subscription_tier`).
5. Renewals happen automatically. `invoice.payment_failed` → `billing_status = 'past_due'` (tier kept, admin nudges). `customer.subscription.deleted` → tier reverts to `free`, `billing_status = 'canceled'`.

### Components

**Stripe configuration**
- Three recurring monthly EUR Prices (Standard, Featured, Exclusive) under one Product family.
- Placeholder amounts **€29 / €59 / €99 per month** — a business decision the user must confirm; amounts live only in Stripe (script args), so changing them later needs no code change.
- `scripts/setup-stripe-products.ts` — one-time script that creates them and prints the price IDs.
- Env vars (test mode first): `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_STANDARD`, `STRIPE_PRICE_FEATURED`, `STRIPE_PRICE_EXCLUSIVE`. Add to `.env.example`, Vercel project env, and `turbo.json` env passthrough if needed at build.

**Database — migration `supabase/migrations/0011_stripe_billing.sql`**
- `businesses` + `billing_email text` (checkout recipient; businesses table currently has no email).
- `partnerships` + `stripe_customer_id text`, `stripe_subscription_id text`, `billing_status` enum (`unbilled | checkout_sent | active | past_due | canceled`, default `unbilled`).
- New `stripe_webhook_events` (`id text primary key` = Stripe event id, `type text`, `payload jsonb`, `processed_at timestamptz`) — idempotency + audit. Service-role access only (RLS deny-all like other internal tables).

**Server code (follows existing server-action + API-route patterns)**
- `apps/web/src/lib/stripe.ts` — Stripe SDK singleton (server-only).
- `apps/web/src/app/actions/admin-billing.ts` — super-admin-gated server actions, modeled on `admin-partnerships.ts`:
  - `createCheckoutLink(partnershipId, tier)` → validates `billing_email` exists, creates/reuses customer, creates Checkout Session, sets `billing_status='checkout_sent'`, returns the URL.
  - `cancelTierSubscription(partnershipId)` → cancels at period end.
- `apps/web/src/app/api/webhooks/stripe/route.ts` (nodejs runtime) — verifies the Stripe signature on the **raw request body**; inserts event id into `stripe_webhook_events` (skip if already present); dispatches to a **pure handler function** `applyStripeEvent(event) → partnership updates` (unit-testable without Stripe). Handled events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`.

**Admin UI**
- `/admin/partnerships`: add a Billing panel per partnership — tier + `billing_status` badge, tier picker, **Create payment link** (copy to clipboard), **Cancel subscription**. Plus `billing_email` field on the business form (`/admin/businesses`).

### Error handling
- Webhook always 200s after recording the event (Stripe retries on non-2xx); processing failures are logged and the event row kept without `processed_at` for reprocessing.
- Checkout link creation fails loudly in the admin UI if `billing_email` is missing or Stripe errors.
- Tier is only ever changed by webhook events (single writer), so admin UI and Stripe can't fight.

### Testing
- Unit tests (vitest, colocated like existing web tests) for `applyStripeEvent` covering: completed checkout sets tier/status; payment failure sets `past_due` without demoting; deletion demotes to `free`; duplicate event ids are no-ops.
- Manual: Stripe test mode + `stripe listen --forward-to localhost:3000/api/webhooks/stripe`, pay with `4242 4242 4242 4242`, confirm tier flips and homepage Featured updates after revalidate.

## Phase 2 — Commission collection (later)

Monthly job (Vercel Cron hitting an admin API route): for each business with `accrued` `commission_events`, create a Stripe Invoice (line item per event or aggregated), mark events `invoiced`; `invoice.paid` webhook marks them `paid`. Reuses the same Stripe customer, webhook route and events table.

## Phase 3 — Hotel SaaS subscriptions (later)

Hotels already have logins and `hotels.subscription_tier`. Add a Billing page in the owner dashboard using Stripe Checkout + the customer portal for self-serve upgrades; same webhook route syncs `hotels.subscription_tier`.

## Explicitly out of scope
- Guest-facing payments (guests never pay through the platform).
- Payouts/Connect (no money is forwarded to businesses or hotels).
- VAT/invoice compliance beyond what Stripe provides out of the box (Stripe Tax can be enabled later).

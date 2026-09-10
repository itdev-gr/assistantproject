# Partner subscriptions, pricing page and billing audit

**Date:** 2026-09-10 · **Status:** implemented (this document is the runbook)

## Model

- A **business** owns its Stripe subscription: `businesses.subscription_tier`, `billing_status`,
  `stripe_subscription_id`, `current_period_end`, `billing_exempt` (migration `0017_business_billing.sql`).
- `businesses.listed` is a **stored generated column**:
  `active AND verified AND (billing_exempt OR billing_status IN ('active','past_due'))`.
  Every public query (`public-directory`, `hotel-directory`, assistant candidates, knowledge
  index, hotel "find businesses", `create_partnership_request`) and the RLS policy filter on it.
- Plans: Standard €29 / Featured €59 / Exclusive €99 per month, VAT included — `apps/web/src/lib/plans.ts`
  is the single source for the pricing page, the signup picker and the audit's amount check.
  Stripe prices come from `STRIPE_PRICE_STANDARD|FEATURED|EXCLUSIVE` (`scripts/setup-stripe-products.ts`,
  idempotent via lookup keys `partner_standard|featured|exclusive`).
- Partnership-level tiers are no longer billed. `partnerships.subscription_tier` stays as an admin
  override for one hotel; `paid_priority_score` is the per-hotel knob. Ranking uses the business tier
  (`RankingCandidate.businessTier`), multiplicative on relevance.
- Admin-created businesses are `billing_exempt` (backfilled for rows without the `partner-owned` tag).
  The anonymous "list your business" form was retired; `/list-your-business` redirects to
  `/signup?role=partner`.

## Flows

1. **Signup** (`/signup?role=partner&plan=<tier>`): plan is required for partners, stored on
   `partner_applications.requested_tier` by `handle_new_user()`. The listing is created unverified.
2. **Payment** (`/partner/billing`): `createPartnerCheckout` → Stripe Checkout (card only,
   `metadata.kind = business_plan`, `client_reference_id = businessId`). Success URL carries
   `session_id`; the page calls `syncMyBillingFromStripe` so the state is right even before the
   webhook lands. Portal (`createPartnerPortalSession`) handles plan switches, card, cancellation.
3. **Review**: admin approves in `/admin/businesses` or `/admin/moderation` (`verified = true`).
4. **Live**: `listed` flips automatically. Partner overview shows the 4-step checklist.

## One mapper, three callers

`subscriptionToBillingState(sub, priceToTier)` in `stripe-billing-events.ts` derives
`{ billing_status, subscription_tier, stripe_subscription_id, current_period_end }` from a Stripe
subscription. Status map: active/trialing → active; past_due/paused → past_due; incomplete →
checkout_sent; unpaid/canceled/incomplete_expired/unknown → canceled (fail closed). It is called by
the webhook (`customer.subscription.updated`), the partner sync action and the reconciler, so they
can never disagree.

Webhook (`/api/webhooks/stripe`): signature check, idempotent insert into `stripe_webhook_events`,
per-event success = at least one row matched across the fan-out; otherwise `error`, `attempts`,
`last_error_at` are recorded and `processed_at` stays null for replay.

## Audit (`/admin/billing`, cron `30 2 * * *` → `/api/cron/reconcile-billing`)

`reconcileBilling()` (pure, `billing-reconcile.ts`) compares a Stripe snapshot with the DB and
reports: `status_mismatch`, `tier_mismatch`, `orphan_subscription`, `missing_subscription`,
`unpaid_listed_business`, `legacy_partnership_subscription`, `webhook_unprocessed`,
`webhook_errored`, `webhook_missed`, `commission_state_stale`, `commission_invoice_lost`,
`price_drift`, `customer_email_drift`. The runner heals fixable issues (sync from Stripe, replay or
ingest events, mark commission paid), re-runs, and stores the remaining issues in
`billing_reconciliation_runs`. The admin sidebar shows a badge with the open count.

## Deploy checklist (order matters)

1. Apply `supabase/migrations/0017_business_billing.sql` (`supabase db push` or the SQL editor)
   **before** deploying this code — the app filters on `businesses.listed`.
2. `pnpm db:types` if the CLI is linked (types were hand-edited to match).
3. Stripe Dashboard → Customer portal: enable plan switching between the three partner prices and
   cancellation. Webhook endpoint must subscribe to `checkout.session.completed`,
   `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`,
   `invoice.payment_failed`.
4. `CRON_SECRET` set on Vercel (already used by the other crons).
5. Optional: re-run `scripts/setup-stripe-products.ts` to add lookup keys to the existing prices
   (creates new prices if amounts differ — update the env vars if so).

## Test-mode runbook

```
stripe listen --forward-to localhost:4323/api/webhooks/stripe   # copy whsec_ into .env.local
```
1. `/signup?role=partner&plan=featured` → confirm email → sign in → `/partner/billing` → pay with
   `4242 4242 4242 4242` → status Active, renewal date, invoice listed.
2. `/admin/businesses` → approve → business appears on `/` and in the assistant.
3. Stripe portal → cancel → `/partner` shows "Payment pending", listing hidden.
4. Flip `businesses.billing_status` by hand → `/admin/billing` → "Run audit now" → issue appears,
   is healed, history row recorded.

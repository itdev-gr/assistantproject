import { setRequestLocale } from 'next-intl/server';
import { createSupabaseServiceClient } from '@aga/db/service';
import { requireSuperAdmin } from '@/lib/auth-context';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { StatCard } from '@/components/dashboard/StatCard';
import { Pill, type PillTone } from '@/components/dashboard/Pill';
import { TableFrame, tableHead, tableRow } from '@/components/dashboard/TableFrame';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { FixButton, RunReconciliationButton } from '@/components/admin/BillingAuditActions';
import type { ReconcileIssue, ReconcileSummary } from '@/lib/billing-reconcile';

interface Props {
  params: Promise<{ locale: string }>;
}

const KIND_LABEL: Record<ReconcileIssue['kind'], { en: string; el: string }> = {
  status_mismatch: { en: 'Status differs from Stripe', el: 'Κατάσταση διαφέρει από Stripe' },
  tier_mismatch: { en: 'Plan differs from Stripe price', el: 'Πλάνο διαφέρει από τιμή Stripe' },
  orphan_subscription: { en: 'Stripe subscription not in DB', el: 'Συνδρομή Stripe εκτός βάσης' },
  missing_subscription: { en: 'DB subscription not in Stripe', el: 'Συνδρομή βάσης εκτός Stripe' },
  unpaid_listed_business: { en: 'Listed without payment', el: 'Δημοσιευμένη χωρίς πληρωμή' },
  legacy_partnership_subscription: {
    en: 'Legacy partnership subscription',
    el: 'Παλιά συνδρομή συνεργασίας',
  },
  webhook_unprocessed: { en: 'Webhook event not processed', el: 'Webhook event χωρίς επεξεργασία' },
  webhook_errored: { en: 'Webhook event failed', el: 'Webhook event απέτυχε' },
  webhook_missed: { en: 'Stripe event never received', el: 'Event Stripe δεν ελήφθη ποτέ' },
  commission_state_stale: { en: 'Commission state stale', el: 'Κατάσταση προμήθειας ξεπερασμένη' },
  commission_invoice_lost: { en: 'Commission invoice missing', el: 'Τιμολόγιο προμήθειας λείπει' },
  price_drift: { en: 'Pricing page ≠ Stripe price', el: 'Σελίδα τιμών ≠ τιμή Stripe' },
  customer_email_drift: { en: 'Customer email differs', el: 'Email πελάτη διαφέρει' },
  legacy_price: { en: 'Subscription on a retired price', el: 'Συνδρομή σε παλιά τιμή' },
  plan_mismatch: { en: 'Hotel package ≠ Stripe price', el: 'Πακέτο ξενοδοχείου ≠ τιμή Stripe' },
  launch_offer_stale: {
    en: 'Launch-offer slot never paid',
    el: 'Θέση προσφοράς έναρξης χωρίς πληρωμή',
  },
};

export default async function AdminBillingPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireSuperAdmin();
  const t = (en: string, el: string) => (locale === 'en' ? en : el);
  const admin = createSupabaseServiceClient();

  const [{ data: runs }, pendingEvents, paying, exempt] = await Promise.all([
    admin
      .from('billing_reconciliation_runs')
      .select('id, ran_at, ok, issue_count, healed_count, issues, summary')
      .order('ran_at', { ascending: false })
      .limit(30),
    admin
      .from('stripe_webhook_events')
      .select('id', { count: 'exact', head: true })
      .is('processed_at', null),
    admin
      .from('businesses')
      .select('id', { count: 'exact', head: true })
      .in('billing_status', ['active', 'past_due'])
      .eq('billing_exempt', false),
    admin
      .from('businesses')
      .select('id', { count: 'exact', head: true })
      .eq('billing_exempt', true),
  ]);
  const latest = runs?.[0] ?? null;
  const issues = ((latest?.issues ?? []) as unknown as ReconcileIssue[]) ?? [];
  const summary = (latest?.summary ?? null) as unknown as
    | (ReconcileSummary & { foundBeforeHealing?: number })
    | null;
  const fmt = (iso: string) =>
    new Date(iso).toLocaleString(locale === 'en' ? 'en-GB' : 'el-GR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  const tone: Record<ReconcileIssue['severity'], PillTone> = { error: 'danger', warn: 'warn' };

  return (
    <div>
      <PageHeader
        title={t('Billing audit', 'Έλεγχος πληρωμών')}
        subtitle={t(
          'Nightly Stripe ↔ database reconciliation. Safe discrepancies are healed automatically; the rest are listed here.',
          'Νυχτερινή αντιπαραβολή Stripe ↔ βάσης. Οι ασφαλείς αποκλίσεις διορθώνονται αυτόματα· οι υπόλοιπες εμφανίζονται εδώ.',
        )}
        actions={<RunReconciliationButton locale={locale} />}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t('Last audit', 'Τελευταίος έλεγχος')}
          value={
            latest
              ? latest.ok
                ? t('Clean', 'Καθαρό')
                : `${latest.issue_count} ${t('issues', 'θέματα')}`
              : '—'
          }
        />
        <StatCard
          label={t('Paying businesses', 'Επιχειρήσεις με συνδρομή')}
          value={paying.count ?? 0}
        />
        <StatCard label={t('Exempt businesses', 'Απαλλαγμένες')} value={exempt.count ?? 0} />
        <StatCard
          label={t('Webhook events pending', 'Events σε εκκρεμότητα')}
          value={pendingEvents.count ?? 0}
        />
      </div>

      {latest && (
        <p className="text-muted-foreground mb-4 text-sm">
          {t('Ran', 'Έτρεξε')} {fmt(latest.ran_at)} · {t('found', 'βρέθηκαν')}{' '}
          {summary?.foundBeforeHealing ?? latest.issue_count} · {t('healed', 'διορθώθηκαν')}{' '}
          {latest.healed_count} · {t('remaining', 'απομένουν')} {latest.issue_count}
          {summary && (
            <>
              {' '}
              · {t('Stripe live subscriptions', 'Ενεργές συνδρομές Stripe')}{' '}
              {summary.liveSubscriptionsInStripe} ·{' '}
              {t('listed businesses', 'δημοσιευμένες επιχειρήσεις')} {summary.businessesListed}
            </>
          )}
        </p>
      )}

      <section className="mb-10">
        <h2 className="mb-3 text-base font-semibold">{t('Open issues', 'Ανοιχτά θέματα')}</h2>
        <TableFrame minWidth="min-w-[760px]">
          {issues.length === 0 ? (
            <EmptyState
              message={
                latest
                  ? t('Everything matches Stripe.', 'Όλα συμφωνούν με το Stripe.')
                  : t(
                      'No audit has run yet. Click “Run audit now”.',
                      'Δεν έχει τρέξει έλεγχος ακόμη. Πατήστε «Εκτέλεση ελέγχου».',
                    )
              }
            />
          ) : (
            <>
              <div className={`grid grid-cols-[9rem_1fr_auto] gap-3 px-4 py-2 ${tableHead}`}>
                <span>{t('Kind', 'Είδος')}</span>
                <span>{t('Details', 'Λεπτομέρειες')}</span>
                <span />
              </div>
              {issues.map((issue, i) => (
                <div
                  key={`${issue.kind}-${issue.entity.id}-${i}`}
                  className={`grid grid-cols-[9rem_1fr_auto] items-start gap-3 px-4 py-3 ${tableRow}`}
                >
                  <div className="space-y-1">
                    <Pill tone={tone[issue.severity]}>{issue.severity}</Pill>
                    <p className="text-xs font-medium">
                      {KIND_LABEL[issue.kind]?.[locale === 'en' ? 'en' : 'el'] ?? issue.kind}
                    </p>
                  </div>
                  <div className="min-w-0 text-[13px]">
                    <p className="font-medium">
                      {issue.entity.type} · {issue.entity.name ?? issue.entity.id}
                    </p>
                    <p className="text-muted-foreground">{issue.message}</p>
                    {(issue.expected !== undefined || issue.actual !== undefined) && (
                      <p className="text-muted-foreground mt-0.5 font-mono text-[11px]">
                        {t('expected', 'αναμενόμενο')}: {String(issue.expected ?? '—')} ·{' '}
                        {t('actual', 'πραγματικό')}: {String(issue.actual ?? '—')}
                      </p>
                    )}
                  </div>
                  <div>
                    {issue.fix ? (
                      <FixButton fix={issue.fix} locale={locale} />
                    ) : (
                      <span className="text-muted-foreground text-xs">
                        {t('manual', 'χειροκίνητα')}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </>
          )}
        </TableFrame>
      </section>

      <section>
        <h2 className="mb-3 text-base font-semibold">{t('Audit history', 'Ιστορικό ελέγχων')}</h2>
        <TableFrame minWidth="min-w-[520px]">
          {(runs ?? []).length === 0 ? (
            <EmptyState message={t('No runs yet.', 'Δεν υπάρχουν εκτελέσεις.')} />
          ) : (
            <>
              <div className={`grid grid-cols-[12rem_6rem_6rem_6rem] gap-3 px-4 py-2 ${tableHead}`}>
                <span>{t('When', 'Πότε')}</span>
                <span>{t('Result', 'Αποτέλεσμα')}</span>
                <span>{t('Healed', 'Διορθώθηκαν')}</span>
                <span>{t('Remaining', 'Απομένουν')}</span>
              </div>
              {(runs ?? []).map((r) => (
                <div
                  key={r.id}
                  className={`grid grid-cols-[12rem_6rem_6rem_6rem] items-center gap-3 px-4 py-2 text-sm ${tableRow}`}
                >
                  <span>{fmt(r.ran_at)}</span>
                  <Pill tone={r.ok ? 'ok' : 'danger'}>
                    {r.ok ? t('Clean', 'Καθαρό') : t('Issues', 'Θέματα')}
                  </Pill>
                  <span>{r.healed_count}</span>
                  <span>{r.issue_count}</span>
                </div>
              ))}
            </>
          )}
        </TableFrame>
      </section>
    </div>
  );
}

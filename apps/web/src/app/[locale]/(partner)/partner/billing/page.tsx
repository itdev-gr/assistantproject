import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { Pill, type PillTone } from '@/components/dashboard/Pill';
import { TableFrame, tableHead, tableRow } from '@/components/dashboard/TableFrame';
import { PartnerBillingActions } from '@/components/partner/PartnerBillingActions';
import { getPartnerBillingSummary, syncMyBillingFromStripe } from '@/app/actions/partner-billing';
import { billingOk } from '@/lib/business-visibility';
import { formatEuro } from '@/lib/plans';

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string; session_id?: string }>;
}

const STATUS_TONE: Record<string, PillTone> = {
  active: 'ok',
  past_due: 'warn',
  canceled: 'danger',
  checkout_sent: 'info',
  unbilled: 'muted',
};

export default async function PartnerBillingPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const t = (en: string, el: string) => (locale === 'en' ? en : el);

  // Back from Stripe Checkout: pull the subscription now instead of waiting
  // for the webhook, so the page never shows "unpaid" right after paying.
  let syncedOk = false;
  if (sp.status === 'success' && sp.session_id) {
    const res = await syncMyBillingFromStripe({ sessionId: sp.session_id });
    syncedOk = res.ok;
  }

  const result = await getPartnerBillingSummary();
  if (!result.ok) {
    return (
      <div>
        <PageHeader title={t('Plan & billing', 'Πλάνο & συνδρομή')} />
        <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
          {t('No business is linked to this account yet.', 'Δεν υπάρχει ακόμη συνδεδεμένη επιχείρηση σε αυτόν τον λογαριασμό.')}
        </div>
      </div>
    );
  }
  const { business, plan, subscription, requestedTier, invoices, stripeConfigured } = result.summary;
  const subscribed = billingOk(business) && !business.billing_exempt;
  const statusLabel: Record<string, string> = {
    active: t('Active', 'Ενεργή'),
    past_due: t('Payment overdue', 'Εκκρεμεί πληρωμή'),
    canceled: t('Canceled', 'Ακυρωμένη'),
    checkout_sent: t('Payment not completed', 'Η πληρωμή δεν ολοκληρώθηκε'),
    unbilled: t('Not started', 'Δεν έχει ξεκινήσει'),
  };
  const fmtDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString(locale === 'en' ? 'en-GB' : 'el-GR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';

  return (
    <div>
      <PageHeader
        title={t('Plan & billing', 'Πλάνο & συνδρομή')}
        subtitle={business.name}
      />

      {sp.status === 'success' && (
        <div className="mb-6 rounded-lg border border-olive/40 bg-olive/10 p-4 text-[14px]">
          <p className="font-semibold">{t('Thank you — payment received.', 'Ευχαριστούμε — η πληρωμή ελήφθη.')}</p>
          <p className="mt-1 text-muted-foreground">
            {syncedOk
              ? t(
                  'Your subscription is active. Your listing goes live as soon as our team approves it.',
                  'Η συνδρομή σας είναι ενεργή. Η καταχώρισή σας δημοσιεύεται μόλις την εγκρίνει η ομάδα μας.',
                )
              : t(
                  'We are confirming the payment with Stripe. Refresh in a moment if the status has not updated.',
                  'Επιβεβαιώνουμε την πληρωμή με το Stripe. Ανανεώστε σε λίγο αν η κατάσταση δεν έχει ενημερωθεί.',
                )}
          </p>
        </div>
      )}
      {sp.status === 'canceled' && (
        <div className="mb-6 rounded-lg border border-gold/60 bg-gold/10 p-4 text-[14px]">
          {t(
            'Checkout was cancelled. Your listing stays hidden until the payment is completed.',
            'Η πληρωμή ακυρώθηκε. Η καταχώρισή σας παραμένει κρυφή μέχρι να ολοκληρωθεί.',
          )}
        </div>
      )}
      {!stripeConfigured && (
        <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-[14px] text-destructive">
          {t('Payments are not configured on this environment.', 'Οι πληρωμές δεν είναι ρυθμισμένες σε αυτό το περιβάλλον.')}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section className="rounded-lg border bg-card p-6">
          <h2 className="text-base font-semibold">{t('Current plan', 'Τρέχον πλάνο')}</h2>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="font-serif text-2xl font-semibold">
              {plan ? (locale === 'en' ? plan.name.en : plan.name.el) : t('No plan', 'Χωρίς πλάνο')}
            </span>
            {plan && (
              <span className="text-sm text-muted-foreground">
                {formatEuro(plan.cents, locale)}/{t('month', 'μήνα')}
              </span>
            )}
            <Pill tone={business.billing_exempt ? 'ok' : (STATUS_TONE[business.billing_status] ?? 'muted')}>
              {business.billing_exempt ? t('Exempt', 'Απαλλαγή') : statusLabel[business.billing_status] ?? business.billing_status}
            </Pill>
          </div>
          <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">{t('Renews on', 'Ανανέωση')}</dt>
              <dd className="font-medium">
                {subscription?.cancelAtPeriodEnd
                  ? t('Ends on', 'Λήγει στις') + ' ' + fmtDate(subscription.renewsAt ?? business.current_period_end)
                  : fmtDate(subscription?.renewsAt ?? business.current_period_end)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t('Listing', 'Καταχώριση')}</dt>
              <dd className="font-medium">
                {business.verified ? t('Approved', 'Εγκεκριμένη') : t('Under review', 'Σε έλεγχο')}
              </dd>
            </div>
          </dl>
          {business.billing_status === 'past_due' && (
            <p className="mt-4 rounded-md bg-gold/10 p-3 text-sm text-deep-ink">
              {t(
                'Your last payment failed. Update your card in the Stripe portal to keep the listing live.',
                'Η τελευταία πληρωμή απέτυχε. Ενημερώστε την κάρτα σας στο portal της Stripe για να παραμείνει η καταχώριση ενεργή.',
              )}
            </p>
          )}
        </section>

        <section className="rounded-lg border bg-card p-6">
          <h2 className="text-base font-semibold">
            {subscribed ? t('Manage', 'Διαχείριση') : t('Complete your subscription', 'Ολοκληρώστε τη συνδρομή σας')}
          </h2>
          <p className="mb-4 mt-1 text-sm text-muted-foreground">
            {subscribed
              ? t('Your subscription is billed monthly through Stripe.', 'Η συνδρομή σας χρεώνεται μηνιαία μέσω Stripe.')
              : t(
                  'Your listing is published only after the payment is active and our team has approved it.',
                  'Η καταχώρισή σας δημοσιεύεται μόνο αφού η πληρωμή είναι ενεργή και η ομάδα μας την εγκρίνει.',
                )}
          </p>
          <PartnerBillingActions
            locale={locale}
            subscribed={subscribed}
            exempt={business.billing_exempt}
            initialTier={requestedTier}
            currentTier={business.subscription_tier}
          />
          <p className="mt-4 text-xs text-muted-foreground">
            <Link href="/pricing" className="text-primary underline-offset-4 hover:underline">
              {t('Compare plans', 'Σύγκριση πλάνων')}
            </Link>
          </p>
        </section>
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-base font-semibold">{t('Invoices', 'Τιμολόγια')}</h2>
        <TableFrame minWidth="min-w-[560px]">
          <div className={`grid grid-cols-[1fr_8rem_7rem_6rem_auto] gap-3 px-4 py-2 ${tableHead}`}>
            <span>{t('Number', 'Αριθμός')}</span>
            <span>{t('Date', 'Ημερομηνία')}</span>
            <span>{t('Amount', 'Ποσό')}</span>
            <span>{t('Status', 'Κατάσταση')}</span>
            <span />
          </div>
          {invoices.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">
              {t('No invoices yet.', 'Δεν υπάρχουν τιμολόγια ακόμη.')}
            </p>
          ) : (
            invoices.map((inv) => (
              <div key={inv.id} className={`grid grid-cols-[1fr_8rem_7rem_6rem_auto] items-center gap-3 px-4 py-3 text-sm ${tableRow}`}>
                <span className="font-medium">{inv.number ?? inv.id}</span>
                <span>{fmtDate(inv.createdAt)}</span>
                <span>{formatEuro(inv.totalCents, locale)}</span>
                <Pill tone={inv.status === 'paid' ? 'ok' : inv.status === 'open' ? 'warn' : 'muted'}>{inv.status}</Pill>
                <span className="flex gap-3 text-xs">
                  {inv.hostedUrl && (
                    <a href={inv.hostedUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      {t('View', 'Προβολή')}
                    </a>
                  )}
                  {inv.pdfUrl && (
                    <a href={inv.pdfUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      PDF
                    </a>
                  )}
                </span>
              </div>
            ))
          )}
        </TableFrame>
      </section>
    </div>
  );
}

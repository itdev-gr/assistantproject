import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { requireOwner } from '@/lib/auth-context';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { Pill, type PillTone } from '@/components/dashboard/Pill';
import { TableFrame, tableHead, tableRow } from '@/components/dashboard/TableFrame';
import { BillingActions } from '@/components/owner/BillingActions';
import { getOwnerBillingSummary, syncMyHotelBillingFromStripe } from '@/app/actions/owner-billing';
import { BILLING_OK } from '@/lib/business-visibility';
import { formatEuro } from '@/lib/plans';
import { LAUNCH_OFFER_LIMIT } from '@/lib/hotel-plans';

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

export default async function OwnerBillingPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  await requireOwner();
  const t = (en: string, el: string) => (locale === 'en' ? en : el);

  // Back from Stripe Checkout: pull the subscription now instead of waiting
  // for the webhook, so the page never shows "unpaid" right after paying.
  let syncedOk = false;
  if (sp.status === 'success' && sp.session_id) {
    const res = await syncMyHotelBillingFromStripe({ sessionId: sp.session_id });
    syncedOk = res.ok;
  }

  const result = await getOwnerBillingSummary();
  if (!result.ok) {
    return (
      <div>
        <PageHeader title={t('Plan & billing', 'Πακέτο & συνδρομή')} />
        <div className="bg-card text-muted-foreground rounded-lg border p-6 text-sm">
          {t('Your hotel could not be loaded.', 'Το κατάλυμά σας δεν φορτώθηκε.')}
        </div>
      </div>
    );
  }
  const { hotel, plan, subscription, launchOfferRemaining, invoices, stripeConfigured, canManage } =
    result.summary;
  const subscribed = BILLING_OK.has(hotel.billing_status);
  const statusLabel: Record<string, string> = {
    active: t('Active', 'Ενεργή'),
    past_due: t('Payment overdue', 'Εκκρεμεί πληρωμή'),
    canceled: t('Canceled', 'Ακυρωμένη'),
    checkout_sent: t('Payment not completed', 'Η πληρωμή δεν ολοκληρώθηκε'),
    unbilled: t('Not started', 'Δεν έχει ξεκινήσει'),
  };
  const fmtDate = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleDateString(locale === 'en' ? 'en-GB' : 'el-GR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : '—';

  return (
    <div>
      <PageHeader title={t('Plan & billing', 'Πακέτο & συνδρομή')} subtitle={hotel.name} />

      {sp.status === 'success' && (
        <div className="border-olive/40 bg-olive/10 mb-6 rounded-lg border p-4 text-[14px]">
          <p className="font-semibold">
            {t('Thank you — payment received.', 'Ευχαριστούμε — η πληρωμή ελήφθη.')}
          </p>
          <p className="text-muted-foreground mt-1">
            {syncedOk
              ? t('Your subscription is active.', 'Η συνδρομή σας είναι ενεργή.')
              : t(
                  'We are confirming the payment with Stripe. Refresh in a moment if the status has not updated.',
                  'Επιβεβαιώνουμε την πληρωμή με το Stripe. Ανανεώστε σε λίγο αν η κατάσταση δεν έχει ενημερωθεί.',
                )}
          </p>
        </div>
      )}
      {sp.status === 'canceled' && (
        <div className="border-gold/60 bg-gold/10 mb-6 rounded-lg border p-4 text-[14px]">
          {t(
            'Checkout was cancelled. You can try again whenever you like.',
            'Η πληρωμή ακυρώθηκε. Μπορείτε να δοκιμάσετε ξανά όποτε θέλετε.',
          )}
        </div>
      )}
      {!stripeConfigured && (
        <div className="border-destructive/30 bg-destructive/10 text-destructive mb-6 rounded-lg border p-4 text-[14px]">
          {t(
            'Payments are not configured on this environment.',
            'Οι πληρωμές δεν είναι ρυθμισμένες σε αυτό το περιβάλλον.',
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <section className="bg-card rounded-lg border p-6">
          <h2 className="text-base font-semibold">{t('Current package', 'Τρέχον πακέτο')}</h2>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="font-serif text-2xl font-semibold">
              {plan ? (locale === 'en' ? plan.name.en : plan.name.el) : hotel.plan}
            </span>
            {plan && (
              <span className="text-muted-foreground text-sm">
                {formatEuro(plan.cents, locale)}/{t('year', 'έτος')}
              </span>
            )}
            <Pill tone={STATUS_TONE[hotel.billing_status] ?? 'muted'}>
              {statusLabel[hotel.billing_status] ?? hotel.billing_status}
            </Pill>
            {hotel.launch_offer_rank && (
              <Pill tone="info">
                {t(
                  `Launch offer #${hotel.launch_offer_rank}`,
                  `Προσφορά έναρξης #${hotel.launch_offer_rank}`,
                )}
              </Pill>
            )}
          </div>
          <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">{t('Renews on', 'Ανανέωση')}</dt>
              <dd className="font-medium">
                {subscription?.cancelAtPeriodEnd
                  ? t('Ends on', 'Λήγει στις') +
                    ' ' +
                    fmtDate(subscription.renewsAt ?? hotel.current_period_end)
                  : fmtDate(subscription?.renewsAt ?? hotel.current_period_end)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t('Billing', 'Χρέωση')}</dt>
              <dd className="font-medium">{t('Yearly, VAT included', 'Ετήσια, με ΦΠΑ')}</dd>
            </div>
          </dl>
          {plan && (
            <ul className="text-muted-foreground mt-4 space-y-1.5 text-sm">
              {plan.features.map((f) => (
                <li key={f.en}>• {locale === 'en' ? f.en : f.el}</li>
              ))}
            </ul>
          )}
          {hotel.billing_status === 'past_due' && (
            <p className="bg-gold/10 text-deep-ink mt-4 rounded-md p-3 text-sm">
              {t(
                'Your last payment failed. Update your card in the Stripe portal to keep the assistant running.',
                'Η τελευταία πληρωμή απέτυχε. Ενημερώστε την κάρτα σας στο portal της Stripe για να συνεχίσει ο βοηθός.',
              )}
            </p>
          )}
        </section>

        <section className="bg-card rounded-lg border p-6">
          <h2 className="text-base font-semibold">
            {subscribed ? t('Manage', 'Διαχείριση') : t('Choose your package', 'Επιλέξτε πακέτο')}
          </h2>
          <p className="text-muted-foreground mb-4 mt-1 text-sm">
            {subscribed
              ? t(
                  'Your subscription is billed yearly through Stripe.',
                  'Η συνδρομή σας χρεώνεται ετησίως μέσω Stripe.',
                )
              : t(
                  'Pick the package that fits your property and complete the payment through Stripe.',
                  'Επιλέξτε το πακέτο που ταιριάζει στο κατάλυμά σας και ολοκληρώστε την πληρωμή μέσω Stripe.',
                )}
          </p>
          <BillingActions
            locale={locale}
            subscribed={subscribed}
            canManage={canManage}
            currentPlan={hotel.plan}
            launchOfferRemaining={Math.min(launchOfferRemaining, LAUNCH_OFFER_LIMIT)}
            launchOfferHeld={hotel.launch_offer_applied}
          />
          <p className="text-muted-foreground mt-4 text-xs">
            <Link href="/pricing" className="text-primary underline-offset-4 hover:underline">
              {t('Compare packages', 'Σύγκριση πακέτων')}
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
            <p className="text-muted-foreground px-4 py-6 text-sm">
              {t('No invoices yet.', 'Δεν υπάρχουν τιμολόγια ακόμη.')}
            </p>
          ) : (
            invoices.map((inv) => (
              <div
                key={inv.id}
                className={`grid grid-cols-[1fr_8rem_7rem_6rem_auto] items-center gap-3 px-4 py-3 text-sm ${tableRow}`}
              >
                <span className="font-medium">{inv.number ?? inv.id}</span>
                <span>{fmtDate(inv.createdAt)}</span>
                <span>{formatEuro(inv.totalCents, locale)}</span>
                <Pill
                  tone={inv.status === 'paid' ? 'ok' : inv.status === 'open' ? 'warn' : 'muted'}
                >
                  {inv.status}
                </Pill>
                <span className="flex gap-3 text-xs">
                  {inv.hostedUrl && (
                    <a
                      href={inv.hostedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {t('View', 'Προβολή')}
                    </a>
                  )}
                  {inv.pdfUrl && (
                    <a
                      href={inv.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
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

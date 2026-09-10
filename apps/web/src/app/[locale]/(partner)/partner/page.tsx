import { setRequestLocale } from 'next-intl/server';
import { Check, Circle, Clock } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { Button, cn } from '@aga/ui';
import { createSupabaseServiceClient } from '@aga/db/service';
import { requirePartner } from '@/lib/auth-context';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { StatCard } from '@/components/dashboard/StatCard';
import { Pill } from '@/components/dashboard/Pill';
import { billingOk, isListed } from '@/lib/business-visibility';

interface Props {
  params: Promise<{ locale: string }>;
}

type StepState = 'done' | 'current' | 'todo' | 'blocked';

export default async function PartnerOverviewPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await requirePartner();
  const t = (en: string, el: string) => (locale === 'en' ? en : el);
  const businessId = ctx.businessIds[0] ?? null;

  if (!businessId) {
    return (
      <div>
        <PageHeader title={t('Partner dashboard', 'Πίνακας συνεργάτη')} />
        <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
          {t(
            'No business is linked to this account yet. Contact us if you think this is a mistake.',
            'Δεν υπάρχει ακόμη συνδεδεμένη επιχείρηση σε αυτόν τον λογαριασμό. Επικοινωνήστε μαζί μας αν πιστεύετε ότι είναι λάθος.',
          )}
        </div>
      </div>
    );
  }

  // Service role: billing columns are not granted to client roles (0017);
  // ownership was already checked by requirePartner().
  const admin = createSupabaseServiceClient();
  const [{ data: business }, favourites, visits, clicks] = await Promise.all([
    admin
      .from('businesses')
      .select('id, name, verified, active, images, address, billing_status, billing_exempt, subscription_tier, listed')
      .eq('id', businessId)
      .maybeSingle(),
    admin.from('user_favorites').select('user_id', { count: 'exact', head: true }).eq('business_id', businessId),
    admin.from('user_visits').select('user_id', { count: 'exact', head: true }).eq('business_id', businessId),
    admin
      .from('referrals')
      .select('id, partnership:partnerships!inner(business_id)', { count: 'exact', head: true })
      .eq('partnership.business_id', businessId)
      .not('clicked_at', 'is', null),
  ]);

  const paid = business ? billingOk(business) : false;
  const reviewed = business?.verified ?? false;
  const live = business ? isListed(business) : false;
  const rejected = ctx.partnerStatus === 'rejected';

  const steps: Array<{ key: string; title: string; body: string; state: StepState; href?: string; cta?: string }> = [
    {
      key: 'account',
      title: t('Account created', 'Λογαριασμός δημιουργήθηκε'),
      body: t('Email confirmed and business details saved.', 'Το email επιβεβαιώθηκε και τα στοιχεία αποθηκεύτηκαν.'),
      state: 'done',
    },
    {
      key: 'payment',
      title: business?.billing_exempt ? t('Payment — not required', 'Πληρωμή — δεν απαιτείται') : t('Complete payment', 'Ολοκλήρωση πληρωμής'),
      body: paid
        ? business?.billing_status === 'past_due'
          ? t('Last payment failed — update your card to keep the listing live.', 'Η τελευταία πληρωμή απέτυχε — ενημερώστε την κάρτα σας.')
          : t('Subscription active.', 'Η συνδρομή είναι ενεργή.')
        : t('Choose a plan and pay securely through Stripe.', 'Επιλέξτε πλάνο και πληρώστε με ασφάλεια μέσω Stripe.'),
      state: paid ? 'done' : 'current',
      href: '/partner/billing',
      cta: paid ? t('Manage', 'Διαχείριση') : t('Pay now', 'Πληρωμή'),
    },
    {
      key: 'review',
      title: t('Review by Roomriv', 'Έλεγχος από τη Roomriv'),
      body: rejected
        ? t('Your application was not approved.', 'Η αίτησή σας δεν εγκρίθηκε.')
        : reviewed
          ? t('Approved — thank you.', 'Εγκρίθηκε — ευχαριστούμε.')
          : t(
              'Our team checks every business by hand. Add photos, hours and a description to speed it up.',
              'Η ομάδα μας ελέγχει κάθε επιχείρηση. Προσθέστε φωτογραφίες, ωράρια και περιγραφή για να επιταχύνετε.',
            ),
      state: rejected ? 'blocked' : reviewed ? 'done' : paid ? 'current' : 'todo',
      href: reviewed ? undefined : '/partner/business',
      cta: reviewed ? undefined : t('Complete listing', 'Συμπλήρωση'),
    },
    {
      key: 'live',
      title: t('Listing live', 'Καταχώριση online'),
      body: live
        ? t('Visible in the guide and to hotel guests through the assistant.', 'Ορατή στον οδηγό και στους επισκέπτες ξενοδοχείων μέσω του βοηθού.')
        : t('Goes live automatically once payment and review are complete.', 'Δημοσιεύεται αυτόματα μόλις ολοκληρωθούν πληρωμή και έλεγχος.'),
      state: live ? 'done' : 'todo',
      href: live ? `/p/${businessId}` : undefined,
      cta: live ? t('View public page', 'Δημόσια σελίδα') : undefined,
    },
  ];

  return (
    <div>
      <PageHeader
        title={business?.name ?? t('Partner dashboard', 'Πίνακας συνεργάτη')}
        subtitle={business?.address ?? undefined}
        actions={
          <>
            {live && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/p/${businessId}`}>{t('View public page', 'Δημόσια σελίδα')}</Link>
              </Button>
            )}
            <Button asChild size="sm">
              <Link href="/partner/business">{t('Edit listing', 'Επεξεργασία')}</Link>
            </Button>
          </>
        }
      />

      {!live && (
        <section className="mb-6 rounded-lg border bg-card p-5">
          <h2 className="text-base font-semibold">{t('Getting your listing live', 'Πώς βγαίνει online η καταχώριση')}</h2>
          <ol className="mt-4 space-y-3">
            {steps.map((s, i) => (
              <li key={s.key} className="flex items-start gap-3">
                <span
                  className={cn(
                    'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
                    s.state === 'done' && 'border-olive bg-olive text-white',
                    s.state === 'current' && 'border-primary text-primary',
                    s.state === 'blocked' && 'border-destructive text-destructive',
                    s.state === 'todo' && 'border-border text-muted-foreground',
                  )}
                  aria-hidden
                >
                  {s.state === 'done' ? <Check className="h-3.5 w-3.5" /> : s.state === 'current' ? <Clock className="h-3.5 w-3.5" /> : s.state === 'blocked' ? '!' : i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={cn('text-[14px] font-medium', s.state === 'todo' && 'text-muted-foreground')}>{s.title}</p>
                  <p className="text-[13px] text-muted-foreground">{s.body}</p>
                </div>
                {s.href && s.cta && (
                  <Button asChild size="sm" variant={s.state === 'current' ? 'default' : 'outline'}>
                    <Link href={s.href}>{s.cta}</Link>
                  </Button>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      <div className="mb-6 flex flex-wrap gap-2">
        <Pill tone={paid ? 'ok' : 'warn'}>
          {business?.billing_exempt
            ? t('Billing exempt', 'Απαλλαγή συνδρομής')
            : paid
              ? t('Subscription active', 'Συνδρομή ενεργή')
              : t('Payment pending', 'Εκκρεμεί πληρωμή')}
        </Pill>
        <Pill tone={reviewed ? 'ok' : 'warn'}>
          {reviewed ? t('Verified', 'Εγκεκριμένη') : t('Awaiting verification', 'Αναμονή έγκρισης')}
        </Pill>
        <Pill tone={live ? 'ok' : 'muted'}>{live ? t('Live', 'Online') : t('Not public yet', 'Μη δημόσια')}</Pill>
        {business && !business.active && <Pill tone="danger">{t('Inactive', 'Ανενεργή')}</Pill>}
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label={t('Favourited by', 'Στα αγαπημένα')} value={favourites.count ?? 0} />
        <StatCard label={t('Marked as visited', 'Σημειωμένες επισκέψεις')} value={visits.count ?? 0} />
        <StatCard label={t('Assistant click-throughs', 'Clicks από τον βοηθό')} value={clicks.count ?? 0} />
      </div>
      <Circle className="hidden" aria-hidden />
    </div>
  );
}

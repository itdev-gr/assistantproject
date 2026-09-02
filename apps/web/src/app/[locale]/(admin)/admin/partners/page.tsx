import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { getServerClient } from '@/lib/supabase-server';
import { requireSuperAdmin } from '@/lib/auth-context';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { FilterChips } from '@/components/dashboard/FilterChips';
import { Pill } from '@/components/dashboard/Pill';
import { TableFrame, tableRow } from '@/components/dashboard/TableFrame';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { PartnerApplicationActions } from '@/components/admin/PartnerApplicationActions';

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string }>;
}

type Status = 'pending' | 'approved' | 'rejected';
const STATUSES: Status[] = ['pending', 'approved', 'rejected'];

export default async function PartnerApplicationsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  await requireSuperAdmin();
  const t = (en: string, el: string) => (locale === 'en' ? en : el);
  const status: Status = STATUSES.includes(sp.status as Status) ? (sp.status as Status) : 'pending';
  const supabase = await getServerClient();

  const [{ data: rows }, ...counts] = await Promise.all([
    supabase
      .from('partner_applications')
      .select(
        'id, email, business_name, phone, address, description, locale, status, business_id, rejection_reason, created_at, reviewed_at, category:business_categories(name_i18n), profile:profiles!partner_applications_user_id_fkey(display_name)',
      )
      .eq('status', status)
      .order('created_at', { ascending: false })
      .limit(100),
    ...STATUSES.map((s) =>
      supabase
        .from('partner_applications')
        .select('id', { count: 'exact', head: true })
        .eq('status', s),
    ),
  ]);
  const countFor = (s: Status) => counts[STATUSES.indexOf(s)]?.count ?? 0;

  const labels: Record<Status, string> = {
    pending: t('Pending', 'Εκκρεμείς'),
    approved: t('Approved', 'Εγκεκριμένες'),
    rejected: t('Rejected', 'Απορριφθείσες'),
  };
  const tone: Record<Status, 'warn' | 'ok' | 'danger'> = {
    pending: 'warn',
    approved: 'ok',
    rejected: 'danger',
  };

  return (
    <div>
      <PageHeader
        title={t('Partner applications', 'Αιτήσεις συνεργατών')}
        subtitle={t(
          'Business owners who signed up as partners. Approving creates (or links) their listing and unlocks their dashboard.',
          'Ιδιοκτήτες επιχειρήσεων που εγγράφηκαν ως συνεργάτες. Η έγκριση δημιουργεί (ή συνδέει) την καταχώρισή τους και ενεργοποιεί το dashboard τους.',
        )}
      />
      <FilterChips
        className="mb-4"
        chips={STATUSES.map((s) => ({
          href: `/admin/partners?status=${s}`,
          label: labels[s],
          count: countFor(s),
          active: s === status,
        }))}
      />
      <TableFrame minWidth="min-w-0">
        {!rows || rows.length === 0 ? (
          <EmptyState message={t('No applications in this state.', 'Καμία αίτηση σε αυτή την κατάσταση.')} />
        ) : (
          rows.map((a) => {
            const catNames = (a.category as unknown as { name_i18n?: Record<string, string> } | null)?.name_i18n;
            const catName = catNames?.[locale] ?? catNames?.el ?? catNames?.en;
            const applicant = (a.profile as unknown as { display_name?: string | null } | null)?.display_name;
            return (
              <div key={a.id} className={`space-y-2 px-4 py-4 ${tableRow}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[14px] font-medium">{a.business_name}</p>
                  {catName && <Pill tone="info">{catName}</Pill>}
                  <Pill tone={tone[a.status as Status]}>{labels[a.status as Status]}</Pill>
                  <span className="text-xs text-muted-foreground">
                    {new Date(a.created_at).toLocaleDateString(locale === 'en' ? 'en-GB' : 'el-GR')}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {applicant ? `${applicant} · ` : ''}
                  {a.email}
                  {a.phone ? ` · ${a.phone}` : ''}
                </p>
                {a.address && <p className="text-xs text-muted-foreground">{a.address}</p>}
                {a.description && <p className="text-[14px]">{a.description}</p>}
                {a.status === 'rejected' && a.rejection_reason && (
                  <p className="text-xs text-destructive">
                    {t('Reason', 'Αιτιολογία')}: {a.rejection_reason}
                  </p>
                )}
                {a.status === 'approved' && a.business_id && (
                  <p className="text-xs">
                    <Link href={`/admin/businesses/${a.business_id}`} className="text-primary hover:underline">
                      {t('Open linked business', 'Άνοιγμα συνδεδεμένης επιχείρησης')}
                    </Link>
                  </p>
                )}
                {a.status === 'pending' && (
                  <PartnerApplicationActions applicationId={a.id} locale={locale} />
                )}
              </div>
            );
          })
        )}
      </TableFrame>
    </div>
  );
}

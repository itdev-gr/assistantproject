import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { createSupabaseServiceClient } from '@aga/db/service';
import { requireSuperAdmin } from '@/lib/auth-context';
import { Button } from '@aga/ui';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { FilterChips } from '@/components/dashboard/FilterChips';
import { SearchForm } from '@/components/dashboard/SearchForm';
import { Pill } from '@/components/dashboard/Pill';
import { TableFrame, tableHead, tableRow } from '@/components/dashboard/TableFrame';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { ModerationActions } from '@/components/admin/ModerationActions';

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string; cat?: string; q?: string }>;
}

type Status = 'all' | 'pending' | 'verified' | 'inactive';
const STATUSES: Status[] = ['all', 'pending', 'verified', 'inactive'];

const GRID = 'grid grid-cols-[1fr_4rem_8rem_7rem_auto] items-center gap-3';

type Category = { id: string; slug: string; name_i18n: Record<string, string> };

export default async function BusinessesListPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  await requireSuperAdmin();
  const t = (en: string, el: string) => (locale === 'en' ? en : el);
  const status: Status = STATUSES.includes(sp.status as Status) ? (sp.status as Status) : 'all';
  const cat = (sp.cat ?? '').trim();
  const q = (sp.q ?? '').trim();
  // Behind requireSuperAdmin(): the service role sees billing/secret columns
  // that client roles are no longer granted (migration 0017).
  const supabase = createSupabaseServiceClient();

  let query = supabase
    .from('businesses')
    .select(
      'id, name, address, price_band, verified, active, created_at, category:business_categories(id, slug, name_i18n)',
    );
  if (q) query = query.ilike('name', `%${q}%`);
  if (cat) query = query.eq('category_id', cat);
  if (status === 'pending') query = query.eq('verified', false).eq('active', true);
  if (status === 'verified') query = query.eq('verified', true).eq('active', true);
  if (status === 'inactive') query = query.eq('active', false);

  const [{ data: rows }, { data: categories }, pendingCount, verifiedCount, inactiveCount, allCount, { data: apps }] =
    await Promise.all([
      query.order('name'),
      supabase.from('business_categories').select('id, slug, name_i18n').order('slug'),
      supabase.from('businesses').select('id', { count: 'exact', head: true }).eq('verified', false).eq('active', true),
      supabase.from('businesses').select('id', { count: 'exact', head: true }).eq('verified', true).eq('active', true),
      supabase.from('businesses').select('id', { count: 'exact', head: true }).eq('active', false),
      supabase.from('businesses').select('id', { count: 'exact', head: true }),
      supabase.from('partner_applications').select('business_id, email').eq('status', 'pending'),
    ]);
  const applicantByBusiness = new Map((apps ?? []).flatMap((a) => (a.business_id ? [[a.business_id, a.email]] : [])));

  // Pending (unverified, active) listings always float to the top so they can
  // be approved right here; everything else stays alphabetical.
  const isPending = (b: { verified: boolean; active: boolean }) => !b.verified && b.active;
  const businesses = [...(rows ?? [])].sort((a, b) => {
    const pa = isPending(a) ? 0 : 1;
    const pb = isPending(b) ? 0 : 1;
    if (pa !== pb) return pa - pb;
    if (pa === 0) return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    return a.name.localeCompare(b.name);
  });

  const counts: Record<Status, number> = {
    all: allCount.count ?? 0,
    pending: pendingCount.count ?? 0,
    verified: verifiedCount.count ?? 0,
    inactive: inactiveCount.count ?? 0,
  };
  const labels: Record<Status, string> = {
    all: t('All', 'Όλες'),
    pending: t('Pending approval', 'Προς έγκριση'),
    verified: t('Verified', 'Εγκεκριμένες'),
    inactive: t('Inactive', 'Ανενεργές'),
  };
  const href = (next: { status?: Status; cat?: string; q?: string }) => {
    const p = new URLSearchParams();
    const s = next.status ?? status;
    const c = next.cat ?? cat;
    const qq = next.q ?? q;
    if (s !== 'all') p.set('status', s);
    if (c) p.set('cat', c);
    if (qq) p.set('q', qq);
    const qs = p.toString();
    return `/admin/businesses${qs ? `?${qs}` : ''}`;
  };
  const catName = (c: Pick<Category, 'slug' | 'name_i18n'> | null) =>
    c?.name_i18n?.[locale] ?? c?.name_i18n?.el ?? c?.slug ?? '';
  return (
    <div>
      <PageHeader
        title={t('Businesses', 'Επιχειρήσεις')}
        subtitle={t(
          'The local businesses shown in the public directory. Listings waiting for approval are always listed first.',
          'Οι τοπικές επιχειρήσεις που εμφανίζονται στον δημόσιο κατάλογο. Όσες περιμένουν έγκριση εμφανίζονται πάντα πρώτες.',
        )}
        actions={
          <Button asChild>
            <Link href="/admin/businesses/new">{t('New business', 'Νέα επιχείρηση')}</Link>
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <FilterChips
          chips={STATUSES.map((s) => ({
            href: href({ status: s }),
            label: labels[s],
            count: counts[s],
            active: s === status,
          }))}
        />
        <SearchForm
          action="/admin/businesses"
          hidden={{ ...(status !== 'all' ? { status } : {}), ...(cat ? { cat } : {}) }}
          defaultValue={q}
          placeholder={t('Search by name', 'Αναζήτηση με όνομα')}
          className="ml-auto"
        />
      </div>
      <FilterChips
        className="mb-4"
        chips={[
          { href: href({ cat: '' }), label: t('All categories', 'Όλες οι κατηγορίες'), active: !cat },
          ...((categories ?? []) as Category[]).map((c) => ({
            href: href({ cat: c.id }),
            label: catName(c),
            active: c.id === cat,
          })),
        ]}
      />

      <TableFrame minWidth="min-w-[760px]">
        <div className={`${GRID} ${tableHead}`}>
          <span>{t('Business', 'Επιχείρηση')}</span>
          <span>{t('Price', 'Τιμή')}</span>
          <span>{t('Verification', 'Έγκριση')}</span>
          <span>{t('Status', 'Κατάσταση')}</span>
          <span />
        </div>
        {businesses.length > 0 ? (
          businesses.map((b) => {
            const c = b.category as unknown as Category | null;
            const pending = isPending(b);
            return (
              <div
                key={b.id}
                className={`${GRID} px-4 py-3 ${tableRow} ${pending ? 'bg-gold/10 hover:bg-gold/15' : ''}`}
              >
                <span className="min-w-0">
                  <Link
                    href={`/admin/businesses/${b.id}`}
                    className="block truncate text-[14px] font-medium hover:underline"
                  >
                    {b.name}
                  </Link>
                  <span className="block truncate text-xs text-muted-foreground">
                    {catName(c)}
                    {b.address ? ` · ${b.address}` : ''}
                    {applicantByBusiness.has(b.id) ? ` · ${applicantByBusiness.get(b.id)}` : ''}
                  </span>
                  {applicantByBusiness.has(b.id) && (
                    <Pill tone="info" className="mt-1">
                      {t('Partner signup', 'Εγγραφή συνεργάτη')}
                    </Pill>
                  )}
                </span>
                <span className="text-xs text-muted-foreground">
                  {b.price_band ? '€'.repeat(b.price_band) : '—'}
                </span>
                <Pill tone={b.verified ? 'ok' : 'warn'}>
                  {b.verified ? t('verified', 'εγκεκριμένη') : t('pending', 'εκκρεμεί')}
                </Pill>
                <Pill tone={b.active ? 'info' : 'muted'}>
                  {b.active ? t('active', 'ενεργή') : t('inactive', 'ανενεργή')}
                </Pill>
                <span className="flex justify-end">
                  {pending ? (
                    <ModerationActions kind="business" id={b.id} locale={locale} />
                  ) : (
                    <Link
                      href={`/admin/businesses/${b.id}`}
                      className="text-[13px] text-primary hover:underline"
                    >
                      {t('Edit', 'Επεξεργασία')}
                    </Link>
                  )}
                </span>
              </div>
            );
          })
        ) : (
          <EmptyState
            message={t('No businesses match these filters.', 'Καμία επιχείρηση με αυτά τα φίλτρα.')}
            query={q}
            noResultsMessage={t(`No results for «${q}».`, `Κανένα αποτέλεσμα για «${q}».`)}
          />
        )}
      </TableFrame>
    </div>
  );
}

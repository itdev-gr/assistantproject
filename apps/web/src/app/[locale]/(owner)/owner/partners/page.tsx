import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { createSupabaseServiceClient } from '@aga/db/service';
import { requireOwner } from '@/lib/auth-context';
import { getServerClient } from '@/lib/supabase-server';
import { formatCommission, pickerState } from '@/lib/connections';
import { hotelHasFeature } from '@/lib/hotel-features';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { FilterChips } from '@/components/dashboard/FilterChips';
import { Pill } from '@/components/dashboard/Pill';
import { SearchForm } from '@/components/dashboard/SearchForm';
import { TableFrame, tableRow } from '@/components/dashboard/TableFrame';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { RequestRow, type RequestRowData } from '@/components/connections/RequestRow';
import { SendRequestForm } from '@/components/connections/SendRequestForm';
import {
  CancelRequestButton,
  DecideRequestActions,
  DisconnectButton,
} from '@/components/connections/ConnectionRequestActions';

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tab?: string; q?: string }>;
}

type Tab = 'connected' | 'incoming' | 'sent' | 'history' | 'find';
const TABS: Tab[] = ['connected', 'incoming', 'sent', 'history', 'find'];

type CategoryEmbed = { name_i18n?: Record<string, string> } | null;
type BusinessEmbed = { id: string; name: string; category: CategoryEmbed } | null;

const catName = (c: CategoryEmbed, locale: string) =>
  c?.name_i18n?.[locale] ?? c?.name_i18n?.el ?? c?.name_i18n?.en ?? '';

export default async function OwnerPartnersPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const ctx = await requireOwner();
  const t = (en: string, el: string) => (locale === 'en' ? en : el);
  const tab: Tab = TABS.includes(sp.tab as Tab) ? (sp.tab as Tab) : 'connected';
  const q = (sp.q ?? '').trim();
  const supabase = await getServerClient();

  // Partner connections are part of the Advanced and Enterprise packages.
  const admin = createSupabaseServiceClient();
  const { data: hotelRow } = await admin
    .from('hotels')
    .select('plan')
    .eq('id', ctx.hotelId)
    .maybeSingle();
  const canConnect = await hotelHasFeature(
    admin,
    { id: ctx.hotelId, plan: hotelRow?.plan ?? 'basic' },
    'partnerConnections',
  );

  const [{ data: partnerships }, { data: requests }] = await Promise.all([
    supabase
      .from('partnerships')
      .select(
        'id, business_id, commission_pct, subscription_tier, guest_offer, active, created_at, business:businesses(id, name, category:business_categories(name_i18n))',
      )
      .eq('hotel_id', ctx.hotelId)
      .order('created_at', { ascending: false }),
    supabase
      .from('partnership_requests')
      .select(
        'id, business_id, status, initiated_by, message, proposed_commission_pct, guest_offer, decline_reason, created_at, decided_at, business:businesses(id, name, category:business_categories(name_i18n))',
      )
      .eq('hotel_id', ctx.hotelId)
      .order('created_at', { ascending: false })
      .limit(200),
  ]);

  const active = (partnerships ?? []).filter((p) => p.active);
  const reqs = (requests ?? []).map((r) => ({
    ...r,
    business: r.business as unknown as BusinessEmbed,
  }));
  const incoming = reqs.filter((r) => r.status === 'pending' && r.initiated_by === 'business');
  const sent = reqs.filter((r) => r.status === 'pending' && r.initiated_by === 'hotel');
  const history = reqs.filter((r) => r.status !== 'pending');

  // Businesses without an owner account: our team answers those requests.
  let unclaimed = new Set<string>();
  if (sent.length > 0) {
    const ids = sent.map((r) => r.business_id);
    const { data: owners } = await admin
      .from('business_owners')
      .select('business_id')
      .in('business_id', ids);
    const owned = new Set((owners ?? []).map((o) => o.business_id));
    unclaimed = new Set(ids.filter((id) => !owned.has(id)));
  }

  // "Find businesses": every active+verified listing (RLS) with its current state.
  let candidates: Array<{ id: string; name: string; address: string; category: CategoryEmbed }> =
    [];
  if (tab === 'find' && canConnect) {
    let query = supabase
      .from('businesses')
      .select('id, name, address, category:business_categories(name_i18n)')
      .eq('listed', true)
      .order('name')
      .limit(60);
    if (q) query = query.ilike('name', `%${q}%`);
    const { data } = await query;
    candidates = (data ?? []).map((b) => ({
      ...b,
      category: b.category as unknown as CategoryEmbed,
    }));
  }
  const partnershipByBusiness = new Map((partnerships ?? []).map((p) => [p.business_id, p]));
  const pendingByBusiness = new Map(
    reqs.filter((r) => r.status === 'pending').map((r) => [r.business_id, r]),
  );

  const labels: Record<Tab, string> = {
    connected: t('Connected', 'Συνδεδεμένα'),
    incoming: t('Incoming', 'Εισερχόμενα'),
    sent: t('Sent', 'Απεσταλμένα'),
    history: t('History', 'Ιστορικό'),
    find: t('Find businesses', 'Εύρεση επιχειρήσεων'),
  };
  const counts: Record<Tab, number | undefined> = {
    connected: active.length,
    incoming: incoming.length,
    sent: sent.length,
    history: history.length,
    find: undefined,
  };

  const acceptLabel = (pct: number | null) => {
    const c = formatCommission(pct, locale);
    return c ? t(`Accept at ${c}`, `Αποδοχή με ${c}`) : t('Accept', 'Αποδοχή');
  };

  return (
    <div>
      <PageHeader
        title={t('Partners', 'Συνεργάτες')}
        subtitle={t(
          'Businesses your assistant recommends to guests. Send requests to new places, answer requests from businesses, and manage active connections.',
          'Οι επιχειρήσεις που προτείνει ο βοηθός στους επισκέπτες σας. Στείλτε αιτήματα σε νέα μέρη, απαντήστε σε αιτήματα επιχειρήσεων και διαχειριστείτε τις ενεργές συνεργασίες.',
        )}
        actions={
          tab !== 'find' && canConnect ? (
            <Link
              href="/owner/partners?tab=find"
              className="bg-primary text-primary-foreground hover:bg-primary-hover inline-flex items-center rounded-md px-4 py-2 text-[14px] font-semibold"
            >
              + {t('Find businesses', 'Εύρεση επιχειρήσεων')}
            </Link>
          ) : undefined
        }
      />
      {!canConnect && (
        <div className="border-gold/60 bg-gold/10 mb-4 rounded-lg border p-4 text-[14px]">
          <p className="font-semibold">
            {t(
              'Partner connections are part of the Advanced and Enterprise packages.',
              'Οι συνδέσεις συνεργατών περιλαμβάνονται στα πακέτα Advanced και Enterprise.',
            )}
          </p>
          <p className="text-muted-foreground mt-1">
            {t(
              'Upgrade to send requests to local businesses, accept theirs and track referrals with commissions. Existing connections stay visible below.',
              'Αναβαθμίστε για να στέλνετε αιτήματα σε τοπικές επιχειρήσεις, να δέχεστε τα δικά τους και να παρακολουθείτε παραπομπές με προμήθειες. Οι υπάρχουσες συνδέσεις παραμένουν ορατές παρακάτω.',
            )}{' '}
            <Link href="/owner/billing" className="text-primary underline-offset-4 hover:underline">
              {t('See packages', 'Δείτε τα πακέτα')}
            </Link>
          </p>
        </div>
      )}
      <FilterChips
        className="mb-4"
        chips={TABS.filter((s) => canConnect || s !== 'find').map((s) => ({
          href: `/owner/partners?tab=${s}`,
          label: labels[s],
          count: counts[s],
          active: s === tab,
        }))}
      />

      {tab === 'connected' && (
        <TableFrame minWidth="min-w-0">
          {active.length === 0 ? (
            <EmptyState
              message={t(
                'No active connections yet. Find businesses to send your first request.',
                'Δεν υπάρχουν ενεργές συνεργασίες ακόμη. Βρείτε επιχειρήσεις για να στείλετε το πρώτο αίτημα.',
              )}
            />
          ) : (
            active.map((p) => {
              const b = p.business as unknown as BusinessEmbed;
              const name = b?.name ?? t('Business no longer listed', 'Επιχείρηση εκτός καταλόγου');
              return (
                <div
                  key={p.id}
                  className={`flex flex-wrap items-center gap-3 px-4 py-4 ${tableRow}`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[14px] font-medium">{name}</p>
                      {b && <Pill tone="info">{catName(b.category, locale)}</Pill>}
                      {p.subscription_tier !== 'free' && (
                        <Pill tone="ok">{p.subscription_tier}</Pill>
                      )}
                    </div>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {formatCommission(p.commission_pct, locale) ??
                        t('No commission', 'Χωρίς προμήθεια')}
                      {' · '}
                      {t('since', 'από')}{' '}
                      {new Date(p.created_at).toLocaleDateString(
                        locale === 'en' ? 'en-GB' : 'el-GR',
                      )}
                    </p>
                    {p.guest_offer && (
                      <p className="mt-1 text-xs">
                        <span className="font-medium">
                          {t('Guest offer', 'Προσφορά επισκεπτών')}:
                        </span>{' '}
                        {p.guest_offer}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {b && (
                      <Link
                        href={`/p/${b.id}`}
                        className="text-primary text-[13px] hover:underline"
                      >
                        {t('View page', 'Προβολή')}
                      </Link>
                    )}
                    <DisconnectButton
                      locale={locale}
                      partnershipId={p.id}
                      counterpartyName={name}
                    />
                  </div>
                </div>
              );
            })
          )}
        </TableFrame>
      )}

      {tab === 'incoming' && (
        <TableFrame minWidth="min-w-0">
          {incoming.length === 0 ? (
            <EmptyState
              message={t('No requests waiting for you.', 'Κανένα αίτημα δεν περιμένει απάντηση.')}
            />
          ) : (
            incoming.map((r) => (
              <RequestRow
                key={r.id}
                locale={locale}
                request={r as RequestRowData}
                title={r.business?.name ?? t('Business', 'Επιχείρηση')}
                subtitle={catName(r.business?.category ?? null, locale)}
                actions={
                  canConnect ? (
                    <DecideRequestActions
                      locale={locale}
                      requestId={r.id}
                      acceptLabel={acceptLabel(r.proposed_commission_pct)}
                    />
                  ) : (
                    <Pill tone="muted">{t('Upgrade to answer', 'Αναβάθμιση για απάντηση')}</Pill>
                  )
                }
              />
            ))
          )}
        </TableFrame>
      )}

      {tab === 'sent' && (
        <TableFrame minWidth="min-w-0">
          {sent.length === 0 ? (
            <EmptyState
              message={t(
                'No pending requests sent.',
                'Δεν υπάρχουν απεσταλμένα αιτήματα σε εκκρεμότητα.',
              )}
            />
          ) : (
            sent.map((r) => (
              <RequestRow
                key={r.id}
                locale={locale}
                request={r as RequestRowData}
                title={r.business?.name ?? t('Business', 'Επιχείρηση')}
                subtitle={catName(r.business?.category ?? null, locale)}
                tags={
                  unclaimed.has(r.business_id) ? (
                    <Pill tone="muted">
                      {t('Our team will answer', 'Θα απαντήσει η ομάδα μας')}
                    </Pill>
                  ) : null
                }
                actions={<CancelRequestButton locale={locale} requestId={r.id} />}
              />
            ))
          )}
        </TableFrame>
      )}

      {tab === 'history' && (
        <TableFrame minWidth="min-w-0">
          {history.length === 0 ? (
            <EmptyState message={t('Nothing here yet.', 'Τίποτα εδώ ακόμη.')} />
          ) : (
            history.map((r) => (
              <RequestRow
                key={r.id}
                locale={locale}
                request={r as RequestRowData}
                title={r.business?.name ?? t('Business', 'Επιχείρηση')}
                subtitle={catName(r.business?.category ?? null, locale)}
                tags={
                  <Pill tone="muted">
                    {r.initiated_by === 'hotel'
                      ? t('Sent by you', 'Από εσάς')
                      : t('Sent by them', 'Από αυτούς')}
                  </Pill>
                }
              />
            ))
          )}
        </TableFrame>
      )}

      {tab === 'find' && canConnect && (
        <div className="space-y-4">
          <SearchForm
            action="/owner/partners"
            hidden={{ tab: 'find' }}
            defaultValue={q}
            placeholder={t('Search businesses by name', 'Αναζήτηση επιχείρησης')}
          />
          <TableFrame minWidth="min-w-0">
            {candidates.length === 0 ? (
              <EmptyState
                message={t('No businesses found.', 'Δεν βρέθηκαν επιχειρήσεις.')}
                query={q}
                noResultsMessage={t(`No results for «${q}».`, `Κανένα αποτέλεσμα για «${q}».`)}
              />
            ) : (
              candidates.map((b) => {
                const state = pickerState(
                  partnershipByBusiness.get(b.id),
                  pendingByBusiness.get(b.id),
                  'hotel',
                );
                return (
                  <div key={b.id} className={`px-4 py-4 ${tableRow}`}>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-[14px] font-medium">{b.name}</p>
                          <Pill tone="info">{catName(b.category, locale)}</Pill>
                        </div>
                        <p className="text-muted-foreground text-xs">{b.address}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/p/${b.id}`}
                          className="text-primary text-[13px] hover:underline"
                        >
                          {t('View page', 'Προβολή')}
                        </Link>
                        {state === 'connected' && (
                          <Pill tone="ok">{t('Connected', 'Συνδεδεμένο')}</Pill>
                        )}
                        {state === 'pending_out' && (
                          <Pill tone="warn">{t('Request pending', 'Αίτημα σε εκκρεμότητα')}</Pill>
                        )}
                        {state === 'pending_in' && (
                          <Link
                            href="/owner/partners?tab=incoming"
                            className="text-primary text-[13px] hover:underline"
                          >
                            {t('They asked you — answer', 'Σας έστειλαν αίτημα — απαντήστε')}
                          </Link>
                        )}
                        {state === 'none' && (
                          <SendRequestForm
                            locale={locale}
                            side="hotel"
                            targetId={b.id}
                            targetName={b.name}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </TableFrame>
        </div>
      )}
    </div>
  );
}

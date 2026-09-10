import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { createSupabaseServiceClient } from '@aga/db/service';
import { requirePartner } from '@/lib/auth-context';
import { getServerClient } from '@/lib/supabase-server';
import { formatCommission, pickerState } from '@/lib/connections';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { FilterChips } from '@/components/dashboard/FilterChips';
import { Pill } from '@/components/dashboard/Pill';
import { SearchForm } from '@/components/dashboard/SearchForm';
import { TableFrame, tableRow } from '@/components/dashboard/TableFrame';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { RequestRow, type RequestRowData } from '@/components/connections/RequestRow';
import { SendRequestForm } from '@/components/connections/SendRequestForm';
import { CancelRequestButton, DecideRequestActions } from '@/components/connections/ConnectionRequestActions';

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tab?: string; q?: string }>;
}

type Tab = 'connected' | 'incoming' | 'sent' | 'history' | 'find';
const TABS: Tab[] = ['connected', 'incoming', 'sent', 'history', 'find'];

export default async function PartnerConnectionsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const ctx = await requirePartner();
  const t = (en: string, el: string) => (locale === 'en' ? en : el);
  const tab: Tab = TABS.includes(sp.tab as Tab) ? (sp.tab as Tab) : 'connected';
  const q = (sp.q ?? '').trim();
  const businessId = ctx.businessIds[0] ?? null;

  if (!businessId) {
    return (
      <div>
        <PageHeader title={t('Hotel connections', 'Συνεργασίες με ξενοδοχεία')} />
        <TableFrame minWidth="min-w-0">
          <EmptyState
            message={t(
              'No business is linked to your account yet.',
              'Δεν υπάρχει ακόμη επιχείρηση συνδεδεμένη με τον λογαριασμό σας.',
            )}
          />
        </TableFrame>
      </div>
    );
  }

  const supabase = await getServerClient();
  // Partners cannot read `partnerships` under RLS (it carries admin-only
  // columns), so their own rows come through the service client with a
  // minimal column list — same precedent as the partner overview counts.
  const admin = createSupabaseServiceClient();

  const [{ data: partnerships }, { data: requests }, { data: ownBusiness }] = await Promise.all([
    admin
      .from('partnerships')
      .select('id, hotel_id, commission_pct, guest_offer, active, created_at')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false }),
    supabase
      .from('partnership_requests')
      .select(
        'id, hotel_id, status, initiated_by, message, proposed_commission_pct, guest_offer, decline_reason, created_at, decided_at',
      )
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(200),
    supabase.from('businesses').select('verified').eq('id', businessId).maybeSingle(),
  ]);
  const verified = ownBusiness?.verified === true;

  const active = (partnerships ?? []).filter((p) => p.active);
  const reqs = requests ?? [];
  const incoming = reqs.filter((r) => r.status === 'pending' && r.initiated_by === 'hotel');
  const sent = reqs.filter((r) => r.status === 'pending' && r.initiated_by === 'business');
  const history = reqs.filter((r) => r.status !== 'pending');

  // Hotel names via the public view (partners cannot read `hotels`).
  const hotelIds = [...new Set([...(partnerships ?? []).map((p) => p.hotel_id), ...reqs.map((r) => r.hotel_id)])];
  const { data: hotelRows } = hotelIds.length
    ? await supabase.from('public_hotels').select('id, name, slug').in('id', hotelIds)
    : { data: [] as { id: string | null; name: string | null; slug: string | null }[] };
  const hotelName = (id: string) =>
    (hotelRows ?? []).find((h) => h.id === id)?.name ?? t('Hotel (inactive)', 'Ξενοδοχείο (ανενεργό)');
  const hotelSlug = (id: string) => (hotelRows ?? []).find((h) => h.id === id)?.slug ?? null;

  let candidates: Array<{ id: string; name: string; slug: string }> = [];
  if (tab === 'find') {
    let query = supabase.from('public_hotels').select('id, name, slug').order('name').limit(60);
    if (q) query = query.ilike('name', `%${q}%`);
    const { data } = await query;
    candidates = (data ?? []).flatMap((h) =>
      h.id && h.name && h.slug ? [{ id: h.id, name: h.name, slug: h.slug }] : [],
    );
  }
  const partnershipByHotel = new Map((partnerships ?? []).map((p) => [p.hotel_id, p]));
  const pendingByHotel = new Map(reqs.filter((r) => r.status === 'pending').map((r) => [r.hotel_id, r]));

  const labels: Record<Tab, string> = {
    connected: t('Connected', 'Συνδεδεμένα'),
    incoming: t('Incoming', 'Εισερχόμενα'),
    sent: t('Sent', 'Απεσταλμένα'),
    history: t('History', 'Ιστορικό'),
    find: t('Find hotels', 'Εύρεση ξενοδοχείων'),
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
        title={t('Hotel connections', 'Συνεργασίες με ξενοδοχεία')}
        subtitle={t(
          'Hotels whose guests get your business recommended. Answer hotel requests or ask a hotel to work with you.',
          'Τα ξενοδοχεία που προτείνουν την επιχείρησή σας στους επισκέπτες τους. Απαντήστε σε αιτήματα ή ζητήστε συνεργασία από ένα ξενοδοχείο.',
        )}
        actions={
          tab !== 'find' ? (
            <Link
              href="/partner/connections?tab=find"
              className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-[14px] font-semibold text-primary-foreground hover:bg-primary-hover"
            >
              + {t('Find hotels', 'Εύρεση ξενοδοχείων')}
            </Link>
          ) : undefined
        }
      />
      <FilterChips
        className="mb-4"
        chips={TABS.map((s) => ({
          href: `/partner/connections?tab=${s}`,
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
                'No hotel recommends you yet. Find hotels to send a request.',
                'Κανένα ξενοδοχείο δεν σας προτείνει ακόμη. Βρείτε ξενοδοχεία για να στείλετε αίτημα.',
              )}
            />
          ) : (
            active.map((p) => (
              <div key={p.id} className={`flex flex-wrap items-center gap-3 px-4 py-4 ${tableRow}`}>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-medium">{hotelName(p.hotel_id)}</p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {formatCommission(p.commission_pct, locale) ?? t('No commission', 'Χωρίς προμήθεια')}
                    {' · '}
                    {t('since', 'από')} {new Date(p.created_at).toLocaleDateString(locale === 'en' ? 'en-GB' : 'el-GR')}
                  </p>
                  {p.guest_offer && (
                    <p className="mt-1 text-xs">
                      <span className="font-medium">{t('Your offer to their guests', 'Η προσφορά σας')}:</span> {p.guest_offer}
                    </p>
                  )}
                </div>
                {hotelSlug(p.hotel_id) && (
                  <Link href={`/h/${hotelSlug(p.hotel_id)}`} className="text-[13px] text-primary hover:underline">
                    {t('Guest page', 'Σελίδα επισκεπτών')}
                  </Link>
                )}
              </div>
            ))
          )}
        </TableFrame>
      )}

      {tab === 'incoming' && (
        <TableFrame minWidth="min-w-0">
          {incoming.length === 0 ? (
            <EmptyState message={t('No hotel requests waiting for you.', 'Κανένα αίτημα ξενοδοχείου σε εκκρεμότητα.')} />
          ) : (
            incoming.map((r) => (
              <RequestRow
                key={r.id}
                locale={locale}
                request={r as RequestRowData}
                title={hotelName(r.hotel_id)}
                actions={
                  <DecideRequestActions
                    locale={locale}
                    requestId={r.id}
                    acceptLabel={acceptLabel(r.proposed_commission_pct)}
                  />
                }
              />
            ))
          )}
        </TableFrame>
      )}

      {tab === 'sent' && (
        <TableFrame minWidth="min-w-0">
          {sent.length === 0 ? (
            <EmptyState message={t('No pending requests sent.', 'Δεν υπάρχουν απεσταλμένα αιτήματα σε εκκρεμότητα.')} />
          ) : (
            sent.map((r) => (
              <RequestRow
                key={r.id}
                locale={locale}
                request={r as RequestRowData}
                title={hotelName(r.hotel_id)}
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
                title={hotelName(r.hotel_id)}
                tags={
                  <Pill tone="muted">
                    {r.initiated_by === 'business' ? t('Sent by you', 'Από εσάς') : t('Sent by the hotel', 'Από το ξενοδοχείο')}
                  </Pill>
                }
              />
            ))
          )}
        </TableFrame>
      )}

      {tab === 'find' && !verified && (
        <TableFrame minWidth="min-w-0">
          <EmptyState
            message={t(
              'You can send requests to hotels as soon as your listing is approved.',
              'Θα μπορείτε να στέλνετε αιτήματα σε ξενοδοχεία μόλις εγκριθεί η καταχώρισή σας.',
            )}
          />
        </TableFrame>
      )}

      {tab === 'find' && verified && (
        <div className="space-y-4">
          <SearchForm
            action="/partner/connections"
            hidden={{ tab: 'find' }}
            defaultValue={q}
            placeholder={t('Search hotels by name', 'Αναζήτηση ξενοδοχείου')}
          />
          <TableFrame minWidth="min-w-0">
            {candidates.length === 0 ? (
              <EmptyState
                message={t('No hotels found.', 'Δεν βρέθηκαν ξενοδοχεία.')}
                query={q}
                noResultsMessage={t(`No results for «${q}».`, `Κανένα αποτέλεσμα για «${q}».`)}
              />
            ) : (
              candidates.map((h) => {
                const state = pickerState(partnershipByHotel.get(h.id), pendingByHotel.get(h.id), 'business');
                return (
                  <div key={h.id} className={`px-4 py-4 ${tableRow}`}>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-medium">{h.name}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link href={`/h/${h.slug}`} className="text-[13px] text-primary hover:underline">
                          {t('Guest page', 'Σελίδα επισκεπτών')}
                        </Link>
                        {state === 'connected' && <Pill tone="ok">{t('Connected', 'Συνδεδεμένο')}</Pill>}
                        {state === 'pending_out' && <Pill tone="warn">{t('Request pending', 'Αίτημα σε εκκρεμότητα')}</Pill>}
                        {state === 'pending_in' && (
                          <Link href="/partner/connections?tab=incoming" className="text-[13px] text-primary hover:underline">
                            {t('They asked you — answer', 'Σας έστειλαν αίτημα — απαντήστε')}
                          </Link>
                        )}
                        {state === 'none' && (
                          <SendRequestForm
                            locale={locale}
                            side="business"
                            targetId={h.id}
                            targetName={h.name}
                            businessId={businessId}
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

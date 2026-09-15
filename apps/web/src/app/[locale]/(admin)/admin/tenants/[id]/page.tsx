import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { getServerClient } from '@/lib/supabase-server';
import { requireSuperAdmin } from '@/lib/auth-context';
import { TenantEditForm } from '@/components/admin/TenantEditForm';
import { InviteHotelUserForm } from '@/components/admin/InviteHotelUserForm';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { Pill } from '@/components/dashboard/Pill';
import { HotelBillingSyncButton } from '@/components/admin/HotelBillingSyncButton';
import { hotelPlanFor } from '@/lib/hotel-plans';
import { formatEuro } from '@/lib/plans';

interface Props {
  params: Promise<{ locale: string; id: string }>;
}

export default async function EditTenantPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  await requireSuperAdmin();
  const supabase = await getServerClient();

  const [{ data: hotel }, { data: members }] = await Promise.all([
    supabase
      .from('hotels')
      .select(
        'id, name, slug, timezone, default_locale, lat, lng, brand_json, plan, active, billing_status, current_period_end, launch_offer_applied, launch_offer_rank, stripe_subscription_id',
      )
      .eq('id', id)
      .maybeSingle(),
    supabase
      .from('hotel_users')
      .select('id, email, role, created_at')
      .eq('hotel_id', id)
      .order('created_at'),
  ]);

  if (!hotel) notFound();
  const brand = (hotel.brand_json ?? {}) as {
    logoUrl?: string | null;
    primaryColor?: string | null;
  };

  return (
    <div className="max-w-3xl">
      <PageHeader
        title={hotel.name}
        backHref="/admin"
        backLabel={locale === 'en' ? 'Hotels' : 'Καταλύματα'}
      />
      <div className="bg-card rounded-lg border p-6">
        <TenantEditForm
          locale={locale}
          initial={{
            id: hotel.id,
            name: hotel.name,
            slug: hotel.slug,
            timezone: hotel.timezone,
            defaultLocale: hotel.default_locale as 'el' | 'en',
            lat: hotel.lat,
            lng: hotel.lng,
            brand: {
              logoUrl: brand.logoUrl ?? null,
              primaryColor: brand.primaryColor ?? null,
            },
            plan: hotel.plan,
            active: hotel.active,
          }}
        />
      </div>

      <h2 className="text-primary mb-4 mt-10 text-xl font-semibold">
        {locale === 'en' ? 'Billing' : 'Συνδρομή'}
      </h2>
      <div className="bg-card space-y-3 rounded-lg border p-6 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">
            {(() => {
              const def = hotelPlanFor(hotel.plan);
              return def
                ? `${locale === 'en' ? def.name.en : def.name.el} · ${formatEuro(def.cents, locale)}/${locale === 'en' ? 'year' : 'έτος'}`
                : hotel.plan;
            })()}
          </span>
          <Pill
            tone={
              hotel.billing_status === 'active'
                ? 'ok'
                : hotel.billing_status === 'past_due'
                  ? 'warn'
                  : 'muted'
            }
          >
            {hotel.billing_status.replace('_', ' ')}
          </Pill>
          {hotel.launch_offer_rank && (
            <Pill tone="info">
              {locale === 'en'
                ? `Launch #${hotel.launch_offer_rank}`
                : `Έναρξη #${hotel.launch_offer_rank}`}
            </Pill>
          )}
          {hotel.current_period_end && (
            <span className="text-muted-foreground text-xs">
              {locale === 'en' ? 'Renews' : 'Ανανέωση'}{' '}
              {new Date(hotel.current_period_end).toLocaleDateString(
                locale === 'en' ? 'en-GB' : 'el-GR',
              )}
            </span>
          )}
        </div>
        <p className="text-muted-foreground text-xs">
          {locale === 'en'
            ? 'The package above is what the owner sees preselected; once they pay, Stripe becomes the source of truth.'
            : 'Το παραπάνω πακέτο προεπιλέγεται για τον ιδιοκτήτη· μόλις πληρώσει, το Stripe γίνεται η πηγή αλήθειας.'}
        </p>
        <HotelBillingSyncButton
          locale={locale}
          hotelId={hotel.id}
          hasSubscription={!!hotel.stripe_subscription_id}
        />
      </div>

      <h2 className="text-primary mb-4 mt-10 text-xl font-semibold">
        {locale === 'en' ? 'Team members' : 'Μέλη ομάδας'}
      </h2>
      <div className="bg-card space-y-4 rounded-lg border p-6">
        <ul className="divide-y">
          {members?.map((m) => (
            <li key={m.id} className="flex items-center justify-between py-2 text-sm">
              <span>{m.email}</span>
              <span className="text-muted-foreground text-xs">{m.role}</span>
            </li>
          ))}
          {(!members || members.length === 0) && (
            <li className="text-muted-foreground py-2 text-sm">
              {locale === 'en' ? 'No members yet.' : 'Κανένα μέλος ακόμη.'}
            </li>
          )}
        </ul>
        <InviteHotelUserForm locale={locale} hotelId={hotel.id} />
      </div>
    </div>
  );
}

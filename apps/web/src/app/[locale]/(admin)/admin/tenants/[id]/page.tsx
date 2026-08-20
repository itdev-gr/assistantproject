import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { getServerClient } from '@/lib/supabase-server';
import { requireSuperAdmin } from '@/lib/auth-context';
import { TenantEditForm } from '@/components/admin/TenantEditForm';
import { InviteHotelUserForm } from '@/components/admin/InviteHotelUserForm';
import { PageHeader } from '@/components/dashboard/PageHeader';

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
        'id, name, slug, timezone, default_locale, lat, lng, brand_json, subscription_tier, active',
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
      <div className="rounded-lg border bg-card p-6">
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
          subscriptionTier: hotel.subscription_tier,
          active: hotel.active,
        }}
        />
      </div>

      <h2 className="mb-4 mt-10 text-xl font-semibold text-primary">
        {locale === 'en' ? 'Team members' : 'Μέλη ομάδας'}
      </h2>
      <div className="space-y-4 rounded-lg border bg-card p-6">
          <ul className="divide-y">
            {members?.map((m) => (
              <li key={m.id} className="flex items-center justify-between py-2 text-sm">
                <span>{m.email}</span>
                <span className="text-xs text-muted-foreground">{m.role}</span>
              </li>
            ))}
            {(!members || members.length === 0) && (
              <li className="py-2 text-sm text-muted-foreground">
                {locale === 'en' ? 'No members yet.' : 'Κανένα μέλος ακόμη.'}
              </li>
            )}
          </ul>
          <InviteHotelUserForm locale={locale} hotelId={hotel.id} />
      </div>
    </div>
  );
}

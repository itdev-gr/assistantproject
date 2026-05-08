import { setRequestLocale } from 'next-intl/server';
import { getServerClient } from '@/lib/supabase-server';
import { requireSuperAdmin } from '@/lib/auth-context';
import { Card, CardContent } from '@aga/ui';
import { FeatureFlagsEditor } from '@/components/admin/FeatureFlagsEditor';

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function FlagsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireSuperAdmin();
  const supabase = await getServerClient();

  const [{ data: hotels }, { data: flags }] = await Promise.all([
    supabase.from('hotels').select('id, name').order('name'),
    supabase.from('feature_flags').select('id, hotel_id, flag, enabled').order('flag'),
  ]);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">
        {locale === 'en' ? 'Feature flags' : 'Feature flags'}
      </h1>
      <Card>
        <CardContent className="p-6">
          <FeatureFlagsEditor
            locale={locale}
            hotels={hotels ?? []}
            rows={(flags ?? []).map((f) => ({
              id: f.id,
              hotelId: f.hotel_id,
              flag: f.flag,
              enabled: f.enabled,
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}

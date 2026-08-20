import { setRequestLocale } from 'next-intl/server';
import { getServerClient } from '@/lib/supabase-server';
import { requireSuperAdmin } from '@/lib/auth-context';
import { FeatureFlagsEditor } from '@/components/admin/FeatureFlagsEditor';
import { PageHeader } from '@/components/dashboard/PageHeader';

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
      <PageHeader
        title="Feature flags"
        subtitle={
          locale === 'en'
            ? 'Global and per-hotel feature switches.'
            : 'Καθολικοί και ανά κατάλυμα διακόπτες λειτουργιών.'
        }
      />
      <div className="rounded-lg border bg-card p-6">
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
      </div>
    </div>
  );
}

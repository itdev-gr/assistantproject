import { setRequestLocale } from 'next-intl/server';
import { requireOwner } from '@/lib/auth-context';
import { AmenityForm } from '@/components/owner/AmenityForm';
import { PageHeader } from '@/components/dashboard/PageHeader';

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function NewAmenityPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireOwner();
  return (
    <div className="max-w-2xl">
      <PageHeader
        title={locale === 'en' ? 'New amenity' : 'Νέα παροχή'}
        backHref="/owner/amenities"
        backLabel={locale === 'en' ? 'Amenities' : 'Παροχές'}
      />
      <div className="rounded-lg border bg-card p-6">
        <AmenityForm
        locale={locale}
        initial={{
          name: '',
          description: null,
          locationOnProperty: null,
          hours: null,
          published: false,
        }}
        />
      </div>
    </div>
  );
}

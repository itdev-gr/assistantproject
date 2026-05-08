import { setRequestLocale } from 'next-intl/server';
import { requireOwner } from '@/lib/auth-context';
import { AmenityForm } from '@/components/owner/AmenityForm';

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function NewAmenityPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireOwner();
  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold">
        {locale === 'en' ? 'New amenity' : 'Νέα παροχή'}
      </h1>
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
  );
}

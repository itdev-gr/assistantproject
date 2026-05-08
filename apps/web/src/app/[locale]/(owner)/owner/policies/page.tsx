import { setRequestLocale } from 'next-intl/server';
import { getServerClient } from '@/lib/supabase-server';
import { requireOwner } from '@/lib/auth-context';
import { Card, CardContent } from '@aga/ui';
import { PoliciesEditor } from '@/components/owner/PoliciesEditor';

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function PoliciesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await requireOwner();
  const supabase = await getServerClient();

  const { data } = await supabase
    .from('policies')
    .select('id, kind, body, locale')
    .eq('hotel_id', ctx.hotelId)
    .order('kind');

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">{locale === 'en' ? 'Policies' : 'Πολιτικές'}</h1>
      <Card>
        <CardContent className="p-6">
          <PoliciesEditor
            locale={locale}
            rows={(data ?? []).map((r) => ({
              id: r.id,
              kind: r.kind,
              body: r.body,
              locale: r.locale as 'el' | 'en',
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}

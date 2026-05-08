import { setRequestLocale } from 'next-intl/server';
import { getServerClient } from '@/lib/supabase-server';
import { requireSuperAdmin } from '@/lib/auth-context';
import { Card, CardContent } from '@aga/ui';
import { CategoriesEditor } from '@/components/admin/CategoriesEditor';

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function CategoriesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireSuperAdmin();
  const supabase = await getServerClient();
  const { data } = await supabase
    .from('business_categories')
    .select('id, slug, name_i18n, parent_id')
    .order('slug');

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">
        {locale === 'en' ? 'Categories' : 'Κατηγορίες'}
      </h1>
      <Card>
        <CardContent className="p-6">
          <CategoriesEditor
            locale={locale}
            rows={(data ?? []).map((c) => ({
              id: c.id,
              slug: c.slug,
              nameI18n: c.name_i18n as Record<string, string>,
              parentId: c.parent_id,
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}

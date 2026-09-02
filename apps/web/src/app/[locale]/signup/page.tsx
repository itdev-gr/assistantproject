import Link from 'next/link';
import { setRequestLocale } from 'next-intl/server';
import { createSupabaseServiceClient } from '@aga/db/service';
import { Card, CardContent, CardHeader, CardTitle } from '@aga/ui';
import { SignupForm, type SignupCategoryOption } from '@/components/auth/SignupForm';

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string; role?: string }>;
}

async function loadCategories(locale: string): Promise<SignupCategoryOption[]> {
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase
    .from('business_categories')
    .select('id, slug, name_i18n')
    .order('slug');
  return (data ?? []).map((c) => {
    const names = (c.name_i18n ?? {}) as Record<string, string>;
    return { id: c.id, name: names[locale] ?? names.el ?? names.en ?? c.slug };
  });
}

export default async function SignupPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const categories = await loadCategories(locale);
  const initialRole = sp.role === 'partner' ? 'partner' : 'user';

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-4 py-10">
      <Link href={`/${locale}`} className="mb-8">
        <img src="/brand/roomriv-stacked-plain.svg" alt="Roomriv" className="h-24 w-auto" />
      </Link>
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{locale === 'en' ? 'Create account' : 'Δημιουργία λογαριασμού'}</CardTitle>
        </CardHeader>
        <CardContent>
          <SignupForm
            next={sp.next}
            locale={locale}
            categories={categories}
            initialRole={initialRole}
          />
        </CardContent>
      </Card>
    </main>
  );
}

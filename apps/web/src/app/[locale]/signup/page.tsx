import { setRequestLocale } from 'next-intl/server';
import { createSupabaseServiceClient } from '@aga/db/service';
import { SignupForm, type SignupCategoryOption } from '@/components/auth/SignupForm';
import { AuthShell } from '@/components/auth/AuthShell';
import { isPaidTier } from '@/lib/plans';

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string; role?: string; plan?: string }>;
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
  const t = (en: string, el: string) => (locale === 'en' ? en : el);
  const categories = await loadCategories(locale);
  const initialPlan = isPaidTier(sp.plan) ? sp.plan : undefined;
  // A plan deep link (pricing page) implies a partner signup.
  const initialRole = sp.role === 'partner' || initialPlan ? 'partner' : 'user';

  return (
    <AuthShell
      locale={locale}
      variant="signup"
      width="lg"
      title={t('Create account', 'Δημιουργία λογαριασμού')}
      subtitle={t(
        'Free for visitors. Partners are reviewed by hand before going live.',
        'Δωρεάν για επισκέπτες. Οι συνεργάτες ελέγχονται από άνθρωπο πριν δημοσιευτούν.',
      )}
    >
      <SignupForm
        next={sp.next}
        locale={locale}
        categories={categories}
        initialRole={initialRole}
        initialPlan={initialPlan}
      />
    </AuthShell>
  );
}

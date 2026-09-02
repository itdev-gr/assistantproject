import Link from 'next/link';
import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@aga/ui';
import { getAuthContext } from '@/lib/auth-context';
import { homeForRole } from '@/lib/roles';
import { getServerClient } from '@/lib/supabase-server';
import { signOut } from '@/app/actions/auth';

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function PartnerPendingPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = (en: string, el: string) => (locale === 'en' ? en : el);
  const prefix = locale === 'en' ? '/en' : '';

  const ctx = await getAuthContext();
  if (!ctx) redirect(`${prefix}/login?next=/partner`);
  if (ctx.role !== 'partner') redirect(`${prefix}${homeForRole(ctx.role)}`);

  const supabase = await getServerClient();
  const [{ data: profile }, { data: app }] = await Promise.all([
    supabase.from('profiles').select('partner_status').eq('id', ctx.userId).maybeSingle(),
    supabase
      .from('partner_applications')
      .select('business_name, phone, address, description, status, rejection_reason, created_at, category:business_categories(name_i18n)')
      .eq('user_id', ctx.userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (profile?.partner_status === 'approved') redirect(`${prefix}/partner`);
  const rejected = profile?.partner_status === 'rejected';
  const catNames = (app?.category as unknown as { name_i18n?: Record<string, string> } | null)?.name_i18n;
  const catName = catNames?.[locale] ?? catNames?.el ?? catNames?.en;

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center px-4 py-10">
      <Link href={`/${locale}`} className="mb-8">
        <img src="/brand/roomriv-stacked-plain.svg" alt="Roomriv" className="h-24 w-auto" />
      </Link>
      <Card className="w-full">
        <CardHeader>
          <CardTitle>
            {rejected
              ? t('Your application was not approved', 'Η αίτησή σας δεν εγκρίθηκε')
              : t('Your application is being reviewed', 'Η αίτησή σας εξετάζεται')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 text-sm text-muted-foreground">
          <p>
            {rejected
              ? t(
                  'Thanks for applying. Unfortunately we could not approve this listing.',
                  'Ευχαριστούμε για την αίτηση. Δυστυχώς δεν μπορέσαμε να εγκρίνουμε αυτή την καταχώριση.',
                )
              : t(
                  'Thanks for applying! Our team checks every business by hand. You will get access to your partner dashboard as soon as it is approved.',
                  'Ευχαριστούμε για την αίτηση! Η ομάδα μας ελέγχει κάθε επιχείρηση. Θα αποκτήσετε πρόσβαση στο dashboard συνεργάτη μόλις εγκριθεί.',
                )}
          </p>
          {rejected && app?.rejection_reason && (
            <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-destructive">
              {app.rejection_reason}
            </p>
          )}
          {app && (
            <dl className="space-y-2 rounded-lg border bg-muted/40 p-4">
              <div>
                <dt className="text-xs uppercase tracking-wide">{t('Business', 'Επιχείρηση')}</dt>
                <dd className="font-medium text-foreground">{app.business_name}</dd>
              </div>
              {catName && (
                <div>
                  <dt className="text-xs uppercase tracking-wide">{t('Category', 'Κατηγορία')}</dt>
                  <dd className="text-foreground">{catName}</dd>
                </div>
              )}
              {app.address && (
                <div>
                  <dt className="text-xs uppercase tracking-wide">{t('Address', 'Διεύθυνση')}</dt>
                  <dd className="text-foreground">{app.address}</dd>
                </div>
              )}
              {app.phone && (
                <div>
                  <dt className="text-xs uppercase tracking-wide">{t('Phone', 'Τηλέφωνο')}</dt>
                  <dd className="text-foreground">{app.phone}</dd>
                </div>
              )}
            </dl>
          )}
          <p>
            {t('Meanwhile you can use your account like any visitor: save favourites and places you have been.', 'Στο μεταξύ μπορείτε να χρησιμοποιείτε τον λογαριασμό σας όπως κάθε επισκέπτης: αγαπημένα και μέρη που έχετε πάει.')}
          </p>
          <div className="flex items-center justify-between gap-3 pt-1">
            <Button asChild variant="outline" size="sm">
              <Link href={`${prefix}/account`}>{t('My account', 'Ο λογαριασμός μου')}</Link>
            </Button>
            <form action={signOut}>
              <Button type="submit" variant="ghost" size="sm">
                {t('Sign out', 'Αποσύνδεση')}
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

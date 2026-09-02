import Link from 'next/link';
import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@aga/ui';
import { getServerClient } from '@/lib/supabase-server';
import { getAuthContext } from '@/lib/auth-context';
import { signOut } from '@/app/actions/auth';

interface Props {
  params: Promise<{ locale: string }>;
}

/**
 * Landing page for a signed-in user whose account is not linked to any hotel
 * (no `aga_role` claim). Previously such users bounced between /owner and
 * /login with no explanation.
 */
export default async function NoAccessPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = (en: string, el: string) => (locale === 'en' ? en : el);
  const prefix = locale === 'en' ? '/en' : '';

  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`${prefix}/login`);

  // Users who *do* have a role never need this page.
  const ctx = await getAuthContext();
  if (ctx) redirect(ctx.role === 'super_admin' ? `${prefix}/admin` : `${prefix}/owner`);

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center px-4">
      <Link href={`/${locale}`} className="mb-8">
        <img src="/brand/roomriv-stacked-plain.svg" alt="Roomriv" className="h-24 w-auto" />
      </Link>
      <Card className="w-full">
        <CardHeader>
          <CardTitle>
            {t('Your account is not linked to a property yet', 'Ο λογαριασμός σας δεν είναι ακόμη συνδεδεμένος με κατάλυμα')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 text-sm text-muted-foreground">
          <p>
            {t('You are signed in as', 'Είστε συνδεδεμένοι ως')}{' '}
            <strong className="text-foreground">{user.email}</strong>.{' '}
            {t(
              'The owner dashboard is only available to hotels and guesthouses that we have activated.',
              'Το dashboard ιδιοκτήτη είναι διαθέσιμο μόνο σε ξενοδοχεία και καταλύματα που έχουμε ενεργοποιήσει.',
            )}
          </p>

          <div className="space-y-3 rounded-lg border bg-muted/40 p-4">
            <p className="font-medium text-foreground">
              {t('Own a restaurant, beach bar, activity or local service?', 'Έχετε εστιατόριο, beach bar, δραστηριότητα ή τοπική υπηρεσία;')}
            </p>
            <p>
              {t(
                'You do not need an account for that — send us a listing request and we will add you to the guide.',
                'Δεν χρειάζεστε λογαριασμό για αυτό — στείλτε μας αίτηση καταχώρισης και θα σας προσθέσουμε στον οδηγό.',
              )}
            </p>
            <Button asChild className="w-full">
              <Link href={`${prefix}/list-your-business`}>
                {t('List your business', 'Καταχωρίστε την επιχείρησή σας')}
              </Link>
            </Button>
          </div>

          <div className="space-y-3 rounded-lg border p-4">
            <p className="font-medium text-foreground">
              {t('Run a hotel or guesthouse?', 'Διαχειρίζεστε ξενοδοχείο ή κατάλυμα;')}
            </p>
            <p>
              {t(
                'Hotel accounts are activated by our team. Send a listing request choosing the accommodation option, or reply to your invitation email, and we will link this account to your property.',
                'Οι λογαριασμοί ξενοδοχείων ενεργοποιούνται από την ομάδα μας. Στείλτε αίτηση καταχώρισης ή απαντήστε στο email πρόσκλησης που λάβατε, και θα συνδέσουμε αυτόν τον λογαριασμό με το κατάλυμά σας.',
              )}
            </p>
          </div>

          <div className="flex items-center justify-between gap-3 pt-1">
            <Button asChild variant="ghost" size="sm">
              <Link href={`/${locale}`}>{t('Back to the guide', 'Επιστροφή στον οδηγό')}</Link>
            </Button>
            <form action={signOut}>
              <Button type="submit" variant="outline" size="sm">
                {t('Sign out', 'Αποσύνδεση')}
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

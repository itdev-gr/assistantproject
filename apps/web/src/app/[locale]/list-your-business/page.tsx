import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { BadgeCheck, MessageCircle, Users } from 'lucide-react';
import { createSupabaseServiceClient } from '@aga/db/service';
import { SiteHeader } from '@/components/public/SiteHeader';
import { SiteFooter } from '@/components/public/SiteFooter';
import { PageMotion } from '@/components/public/motion';
import {
  ListingRequestForm,
  type ListingCategoryOption,
} from '@/components/public/ListingRequestForm';

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const en = locale === 'en';
  const title = en ? 'List your business — Roomriv' : 'Καταχωρίστε την επιχείρησή σας — Roomriv';
  const description = en
    ? 'Add your restaurant, beach bar, activity or local service to the Roomriv guide. Free, reviewed by hand, recommended to hotel guests across Greece.'
    : 'Προσθέστε το εστιατόριο, το beach bar, τη δραστηριότητα ή την τοπική σας υπηρεσία στον οδηγό Roomriv. Δωρεάν, με έλεγχο από άνθρωπο, με προτάσεις σε επισκέπτες ξενοδοχείων σε όλη την Ελλάδα.';
  return {
    title,
    description,
    alternates: {
      canonical: en ? '/en/list-your-business' : '/list-your-business',
      languages: {
        el: '/list-your-business',
        en: '/en/list-your-business',
        'x-default': '/list-your-business',
      },
    },
  };
}

async function loadCategories(locale: string): Promise<ListingCategoryOption[]> {
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

export default async function ListYourBusinessPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = (en: string, el: string) => (locale === 'en' ? en : el);
  const categories = await loadCategories(locale);

  const perks = [
    {
      icon: Users,
      title: t('Reach hotel guests', 'Φτάστε στους επισκέπτες ξενοδοχείων'),
      body: t(
        'Partner hotels recommend listed businesses to their guests through the Roomriv assistant.',
        'Τα συνεργαζόμενα ξενοδοχεία προτείνουν τις καταχωρισμένες επιχειρήσεις στους επισκέπτες τους μέσω του βοηθού Roomriv.',
      ),
    },
    {
      icon: BadgeCheck,
      title: t('Verified, not sponsored', 'Επαληθευμένο, όχι διαφήμιση'),
      body: t(
        'We check every place ourselves. Visitors trust the guide because nothing is paid placement.',
        'Ελέγχουμε κάθε μέρος οι ίδιοι. Οι επισκέπτες εμπιστεύονται τον οδηγό γιατί τίποτα δεν είναι πληρωμένη προβολή.',
      ),
    },
    {
      icon: MessageCircle,
      title: t('Direct contact', 'Άμεση επικοινωνία'),
      body: t(
        'Guests call, message or visit you directly. No middlemen, no booking fees.',
        'Οι επισκέπτες σας καλούν, σας γράφουν ή έρχονται απευθείας. Χωρίς μεσάζοντες, χωρίς προμήθειες κράτησης.',
      ),
    },
  ];

  return (
    <PageMotion>
      <div className="flex min-h-dvh flex-col bg-background">
        <SiteHeader locale={locale} />
        <main className="flex-1">
          <section className="border-b bg-gradient-to-b from-sky-50 to-background">
            <div className="mx-auto max-w-6xl px-4 py-14 md:py-20">
              <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-primary">
                {t('For businesses', 'Για επιχειρήσεις')}
              </p>
              <h1 className="max-w-3xl font-serif text-4xl font-semibold leading-tight sm:text-5xl">
                {t(
                  'Put your business in front of travellers across Greece.',
                  'Βάλτε την επιχείρησή σας μπροστά σε ταξιδιώτες σε όλη την Ελλάδα.',
                )}
              </h1>
              <p className="mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
                {t(
                  'Restaurants, beaches, boat trips, shops, taxis and local services — if locals would recommend it, it belongs in the guide. Listing is free.',
                  'Εστιατόρια, παραλίες, εκδρομές με σκάφος, καταστήματα, ταξί και τοπικές υπηρεσίες — αν θα το πρότειναν οι ντόπιοι, ανήκει στον οδηγό. Η καταχώριση είναι δωρεάν.',
                )}
              </p>
            </div>
          </section>

          <section className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-[1fr_minmax(0,1.6fr)] md:py-16">
            <aside className="space-y-6">
              {perks.map((p) => (
                <div key={p.title} className="flex gap-3">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-100 text-primary">
                    <p.icon className="h-4 w-4" aria-hidden />
                  </span>
                  <div>
                    <h2 className="text-base font-semibold">{p.title}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{p.body}</p>
                  </div>
                </div>
              ))}
              <div className="rounded-xl border bg-muted/40 p-4 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">
                  {t('Run a hotel or guesthouse?', 'Διαχειρίζεστε ξενοδοχείο ή κατάλυμα;')}
                </p>
                <p className="mt-1">
                  {t(
                    'Hotels get their own AI guest assistant and dashboard. Send us the request below with the category “Accommodation” and we will set you up.',
                    'Τα ξενοδοχεία αποκτούν δικό τους AI βοηθό επισκεπτών και dashboard. Στείλτε την αίτηση παρακάτω και θα επικοινωνήσουμε για την ενεργοποίηση.',
                  )}
                </p>
              </div>
            </aside>

            <div className="relative rounded-2xl border bg-card p-6 shadow-sm md:p-8">
              <h2 className="font-serif text-2xl font-semibold">
                {t('Listing request', 'Αίτηση καταχώρισης')}
              </h2>
              <p className="mb-6 mt-1 text-sm text-muted-foreground">
                {t(
                  'Takes about two minutes. Fields marked * are required.',
                  'Χρειάζονται περίπου δύο λεπτά. Τα πεδία με * είναι υποχρεωτικά.',
                )}
              </p>
              <ListingRequestForm locale={locale} categories={categories} />
            </div>
          </section>
        </main>
        <SiteFooter locale={locale} />
      </div>
    </PageMotion>
  );
}

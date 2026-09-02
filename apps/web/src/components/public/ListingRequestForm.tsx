'use client';

import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Button, Input, Label, Textarea, cn } from '@aga/ui';
import { Link } from '@/i18n/routing';
import { submitListingRequest } from '@/app/actions/listing-request';
import { LISTING_ERROR_TEXT, type ListingRequestErrorCode } from '@/lib/listing-request';

export interface ListingCategoryOption {
  id: string;
  name: string;
}

interface Props {
  locale: string;
  categories: ListingCategoryOption[];
}

type FieldKey =
  | 'name'
  | 'categoryId'
  | 'area'
  | 'address'
  | 'phone'
  | 'email'
  | 'website'
  | 'description';

const EMPTY: Record<FieldKey, string> = {
  name: '',
  categoryId: '',
  area: '',
  address: '',
  phone: '',
  email: '',
  website: '',
  description: '',
};

export function ListingRequestForm({ locale, categories }: Props) {
  const t = (en: string, el: string) => (locale === 'en' ? en : el);
  const [values, setValues] = useState<Record<FieldKey, string>>(EMPTY);
  const [honeypot, setHoneypot] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ListingRequestErrorCode | null>(null);
  const [fieldErrs, setFieldErrs] = useState<Partial<Record<FieldKey, true>>>({});
  const [done, setDone] = useState(false);

  function set(key: FieldKey, v: string) {
    setValues((prev) => ({ ...prev, [key]: v }));
    if (fieldErrs[key]) setFieldErrs((prev) => ({ ...prev, [key]: undefined }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setFieldErrs({});
    const result = await submitListingRequest({
      locale: locale === 'en' ? 'en' : 'el',
      ...values,
      website: values.website || undefined,
      company: honeypot,
    });
    setPending(false);
    if (result.ok) {
      setDone(true);
      return;
    }
    setError(result.error);
    if (result.fields) {
      const next: Partial<Record<FieldKey, true>> = {};
      for (const k of Object.keys(result.fields)) next[k as FieldKey] = true;
      setFieldErrs(next);
    }
  }

  if (done) {
    return (
      <div
        role="status"
        className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center"
      >
        <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" aria-hidden />
        <h2 className="mt-4 font-serif text-2xl font-semibold text-emerald-900">
          {t('Thank you — we received your request.', 'Ευχαριστούμε — λάβαμε την αίτησή σας.')}
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm text-emerald-900/80">
          {t(
            'Our team reviews every listing by hand. We will contact you at the phone or email you gave us, usually within a few working days.',
            'Η ομάδα μας ελέγχει κάθε καταχώριση με το χέρι. Θα επικοινωνήσουμε μαζί σας στο τηλέφωνο ή το email που δώσατε, συνήθως μέσα σε λίγες εργάσιμες ημέρες.',
          )}
        </p>
        <Button asChild className="mt-6">
          <Link href="/">{t('Back to the guide', 'Επιστροφή στον οδηγό')}</Link>
        </Button>
      </div>
    );
  }

  const inputCls = (k: FieldKey) =>
    cn(fieldErrs[k] && 'border-destructive focus-visible:ring-destructive');

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {/* Honeypot: hidden from humans, bots tend to fill every field. */}
      <div className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden" aria-hidden>
        <label htmlFor="company">Company</label>
        <input
          id="company"
          name="company"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="name">{t('Business name', 'Όνομα επιχείρησης')} *</Label>
          <Input
            id="name"
            name="name"
            required
            maxLength={120}
            value={values.name}
            onChange={(e) => set('name', e.target.value)}
            className={inputCls('name')}
            placeholder={t('e.g. Taverna Nikos', 'π.χ. Ταβέρνα Νίκος')}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="categoryId">{t('Category', 'Κατηγορία')} *</Label>
          <select
            id="categoryId"
            name="categoryId"
            required
            value={values.categoryId}
            onChange={(e) => set('categoryId', e.target.value)}
            className={cn(
              'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              inputCls('categoryId'),
            )}
          >
            <option value="">{t('Choose…', 'Επιλέξτε…')}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="area">{t('Town / area', 'Πόλη / περιοχή')} *</Label>
          <Input
            id="area"
            name="area"
            required
            maxLength={120}
            value={values.area}
            onChange={(e) => set('area', e.target.value)}
            className={inputCls('area')}
            placeholder={t('e.g. Chania, Crete', 'π.χ. Χανιά, Κρήτη')}
          />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="address">{t('Street address', 'Διεύθυνση')} *</Label>
          <Input
            id="address"
            name="address"
            required
            maxLength={300}
            value={values.address}
            onChange={(e) => set('address', e.target.value)}
            className={inputCls('address')}
            placeholder={t('Street and number, or landmark', 'Οδός και αριθμός, ή σημείο αναφοράς')}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="phone">{t('Phone', 'Τηλέφωνο')} *</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            required
            autoComplete="tel"
            maxLength={40}
            value={values.phone}
            onChange={(e) => set('phone', e.target.value)}
            className={inputCls('phone')}
            placeholder="+30 …"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            maxLength={200}
            value={values.email}
            onChange={(e) => set('email', e.target.value)}
            className={inputCls('email')}
          />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="website">
            {t('Website or social page', 'Ιστοσελίδα ή σελίδα στα social')}{' '}
            <span className="font-normal text-muted-foreground">
              ({t('optional', 'προαιρετικό')})
            </span>
          </Label>
          <Input
            id="website"
            name="website"
            type="text"
            inputMode="url"
            maxLength={200}
            value={values.website}
            onChange={(e) => set('website', e.target.value)}
            className={inputCls('website')}
            placeholder="www.example.gr"
          />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="description">
            {t('Tell us about your place', 'Λίγα λόγια για την επιχείρησή σας')} *
          </Label>
          <Textarea
            id="description"
            name="description"
            required
            rows={5}
            minLength={20}
            maxLength={1200}
            value={values.description}
            onChange={(e) => set('description', e.target.value)}
            className={inputCls('description')}
            placeholder={t(
              'What do you offer, what makes it special, who is it for? (at least 20 characters)',
              'Τι προσφέρετε, τι το ξεχωριστό έχει, σε ποιους απευθύνεται; (τουλάχιστον 20 χαρακτήρες)',
            )}
          />
          <p className="text-xs text-muted-foreground">
            {values.description.length}/1200
          </p>
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {LISTING_ERROR_TEXT[error][locale === 'en' ? 'en' : 'el']}
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          {t(
            'Free of charge. Every request is reviewed by a person before it appears in the guide.',
            'Δωρεάν. Κάθε αίτηση ελέγχεται από άνθρωπο πριν εμφανιστεί στον οδηγό.',
          )}
        </p>
        <Button type="submit" size="lg" disabled={pending} className="sm:min-w-[200px]">
          {pending ? t('Sending…', 'Αποστολή…') : t('Send request', 'Αποστολή αίτησης')}
        </Button>
      </div>
    </form>
  );
}

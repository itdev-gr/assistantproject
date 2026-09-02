'use client';

import { useState } from 'react';
import { useRouter, Link } from '@/i18n/routing';
import { Button, Input, Label, Textarea, cn } from '@aga/ui';
import { Store, User, MailCheck } from 'lucide-react';
import { signUpWithPassword } from '@/app/actions/auth';
import { dashSelect } from '@/components/dashboard/field-classes';

export interface SignupCategoryOption {
  id: string;
  name: string;
}

type Role = 'user' | 'partner';

interface Props {
  next?: string;
  locale: string;
  categories: SignupCategoryOption[];
  initialRole?: Role;
}

export function SignupForm({ next, locale, categories, initialRole = 'user' }: Props) {
  const router = useRouter();
  const t = (en: string, el: string) => (locale === 'en' ? en : el);

  const [role, setRole] = useState<Role>(initialRole);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [confirmationSent, setConfirmationSent] = useState(false);

  function describeError(code: string): string {
    switch (code) {
      case 'invalid_input':
        return t('Please check the highlighted fields.', 'Ελέγξτε τα επισημασμένα πεδία.');
      case 'rate_limited':
        return t('Too many attempts. Try again later.', 'Πολλές προσπάθειες. Δοκιμάστε αργότερα.');
      case 'already_registered':
        return t(
          'An account with this email already exists. Sign in instead.',
          'Υπάρχει ήδη λογαριασμός με αυτό το email. Συνδεθείτε.',
        );
      default:
        return code;
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setFieldErrors({});
    const result = await signUpWithPassword({
      email,
      password,
      role,
      displayName: displayName || undefined,
      locale: locale === 'en' ? 'en' : 'el',
      ...(role === 'partner'
        ? {
            businessName,
            businessCategoryId: categoryId,
            businessPhone: phone,
            businessAddress: address,
            businessDescription: description || undefined,
          }
        : {}),
    });
    setPending(false);
    if (!result.ok) {
      setError(describeError(result.error));
      if (result.fields) setFieldErrors(result.fields);
      return;
    }
    if (result.needsConfirmation) {
      setConfirmationSent(true);
      return;
    }
    router.push(next ?? result.home);
    router.refresh();
  }

  if (confirmationSent) {
    return (
      <div className="space-y-4 text-sm">
        <div className="bg-muted/40 flex items-start gap-3 rounded-lg border p-4">
          <MailCheck className="text-primary mt-0.5 h-5 w-5 shrink-0" aria-hidden />
          <div>
            <p className="text-foreground font-medium">
              {t('Check your email', 'Ελέγξτε το email σας')}
            </p>
            <p className="text-muted-foreground mt-1">
              {t(
                `We sent a confirmation link to ${email}. Open it to activate your account.`,
                `Στείλαμε σύνδεσμο επιβεβαίωσης στο ${email}. Ανοίξτε τον για να ενεργοποιήσετε τον λογαριασμό σας.`,
              )}
            </p>
            {role === 'partner' && (
              <p className="text-muted-foreground mt-2">
                {t(
                  'Your partner application has been received. We will review it and let you know.',
                  'Λάβαμε την αίτηση συνεργασίας σας. Θα την εξετάσουμε και θα σας ενημερώσουμε.',
                )}
              </p>
            )}
          </div>
        </div>
        <p className="text-muted-foreground text-center">
          <Link href="/login" className="text-primary underline-offset-4 hover:underline">
            {t('Go to sign in', 'Μετάβαση στην είσοδο')}
          </Link>
        </p>
      </div>
    );
  }

  const roleCard = (value: Role, Icon: typeof User, title: string, body: string) => (
    <button
      type="button"
      onClick={() => setRole(value)}
      aria-pressed={role === value}
      className={cn(
        'flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors',
        role === value
          ? 'border-primary bg-primary/5 ring-primary/20 ring-2'
          : 'border-input hover:bg-muted/50',
      )}
    >
      <span className="flex items-center gap-2 text-sm font-medium">
        <Icon className="text-primary h-4 w-4" aria-hidden />
        {title}
      </span>
      <span className="text-muted-foreground text-xs">{body}</span>
    </button>
  );

  const fieldError = (key: string) =>
    fieldErrors[key] ? (
      <p className="text-destructive text-xs">
        {t('This field is required.', 'Το πεδίο είναι υποχρεωτικό.')}
      </p>
    ) : null;

  return (
    <div className="space-y-4">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label>{t('I am signing up as', 'Εγγράφομαι ως')}</Label>
          <div className="grid grid-cols-2 gap-2">
            {roleCard(
              'user',
              User,
              t('Visitor', 'Επισκέπτης'),
              t('Save favourites and places you have been.', 'Αγαπημένα και μέρη που έχετε πάει.'),
            )}
            {roleCard(
              'partner',
              Store,
              t('Partner', 'Συνεργάτης'),
              t('List and manage your business.', 'Καταχώριση και διαχείριση επιχείρησης.'),
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="displayName">{t('Name', 'Όνομα')}</Label>
          <Input
            id="displayName"
            autoComplete="name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {fieldError('email')}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">
            {t('Password (min 8 chars)', 'Κωδικός (τουλάχιστον 8 χαρακτήρες)')}
          </Label>
          <Input
            id="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {fieldError('password')}
        </div>

        {role === 'partner' && (
          <fieldset className="bg-muted/30 space-y-3 rounded-lg border p-4">
            <legend className="px-1 text-sm font-medium">
              {t('Your business', 'Η επιχείρησή σας')}
            </legend>
            <p className="text-muted-foreground text-xs">
              {t(
                'We review every application by hand before it goes live.',
                'Ελέγχουμε κάθε αίτηση πριν δημοσιευτεί.',
              )}
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="businessName">{t('Business name', 'Όνομα επιχείρησης')} *</Label>
              <Input
                id="businessName"
                required={role === 'partner'}
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
              />
              {fieldError('businessName')}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="categoryId">{t('Category', 'Κατηγορία')} *</Label>
              <select
                id="categoryId"
                required={role === 'partner'}
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className={dashSelect}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {fieldError('businessCategoryId')}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="phone">{t('Phone', 'Τηλέφωνο')} *</Label>
                <Input
                  id="phone"
                  type="tel"
                  required={role === 'partner'}
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
                {fieldError('businessPhone')}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="address">{t('Address', 'Διεύθυνση')} *</Label>
                <Input
                  id="address"
                  required={role === 'partner'}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
                {fieldError('businessAddress')}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">{t('Short description', 'Σύντομη περιγραφή')}</Label>
              <Textarea
                id="description"
                rows={3}
                maxLength={1200}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </fieldset>
        )}

        <Button type="submit" className="w-full" disabled={pending}>
          {pending
            ? t('Creating…', 'Δημιουργία…')
            : role === 'partner'
              ? t('Create account & apply', 'Δημιουργία & αίτηση')
              : t('Create account', 'Δημιουργία λογαριασμού')}
        </Button>
        {error && <p className="text-destructive text-xs">{error}</p>}
      </form>

      <p className="text-muted-foreground text-center text-sm">
        {t('Already have an account?', 'Έχετε ήδη λογαριασμό;')}{' '}
        <Link href="/login" className="text-primary underline-offset-4 hover:underline">
          {t('Sign in', 'Είσοδος')}
        </Link>
      </p>
    </div>
  );
}

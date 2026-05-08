'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { hotelProfileSchema, type HotelProfile } from '@aga/api-contracts';
import { Button, Input, Label, Card, CardContent } from '@aga/ui';
import { updateHotelProfile } from '@/app/actions/owner-property';

interface Props {
  locale: string;
  initial: HotelProfile;
}

export function PropertyForm({ locale, initial }: Props) {
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<HotelProfile>({
    resolver: zodResolver(hotelProfileSchema),
    defaultValues: initial,
  });

  async function onSubmit(values: HotelProfile) {
    setStatus('saving');
    setError(null);
    const result = await updateHotelProfile(values);
    if (result.ok) {
      setStatus('saved');
    } else {
      setStatus('error');
      setError(result.error);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Card>
        <CardContent className="space-y-4 p-6">
          <Field id="name" label={locale === 'en' ? 'Name' : 'Όνομα'} error={errors.name?.message}>
            <Input id="name" {...register('name')} />
          </Field>
          <Field id="slug" label="Slug" error={errors.slug?.message}>
            <Input id="slug" {...register('slug')} />
          </Field>
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              id="timezone"
              label={locale === 'en' ? 'Timezone' : 'Ζώνη ώρας'}
              error={errors.timezone?.message}
            >
              <Input id="timezone" {...register('timezone')} />
            </Field>
            <Field
              id="defaultLocale"
              label={locale === 'en' ? 'Default language' : 'Προεπιλεγμένη γλώσσα'}
              error={errors.defaultLocale?.message}
            >
              <select
                id="defaultLocale"
                {...register('defaultLocale')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="el">Ελληνικά</option>
                <option value="en">English</option>
              </select>
            </Field>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field id="lat" label="Latitude" error={errors.lat?.message}>
              <Input
                id="lat"
                type="number"
                step="0.0001"
                {...register('lat', { valueAsNumber: true, setValueAs: numOrNull })}
              />
            </Field>
            <Field id="lng" label="Longitude" error={errors.lng?.message}>
              <Input
                id="lng"
                type="number"
                step="0.0001"
                {...register('lng', { valueAsNumber: true, setValueAs: numOrNull })}
              />
            </Field>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              id="primaryColor"
              label={locale === 'en' ? 'Primary color (hex)' : 'Κύριο χρώμα (hex)'}
              error={errors.brand?.primaryColor?.message}
            >
              <Input id="primaryColor" placeholder="#0c8ec5" {...register('brand.primaryColor')} />
            </Field>
            <Field
              id="logoUrl"
              label={locale === 'en' ? 'Logo URL' : 'URL λογότυπου'}
              error={errors.brand?.logoUrl?.message}
            >
              <Input id="logoUrl" placeholder="https://…" {...register('brand.logoUrl')} />
            </Field>
          </div>
        </CardContent>
      </Card>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={!isDirty || status === 'saving'}>
          {status === 'saving'
            ? locale === 'en'
              ? 'Saving…'
              : 'Αποθήκευση…'
            : locale === 'en'
              ? 'Save'
              : 'Αποθήκευση'}
        </Button>
        {status === 'saved' && (
          <span className="text-sm text-muted-foreground">
            {locale === 'en' ? 'Saved' : 'Αποθηκεύτηκε'}
          </span>
        )}
        {status === 'error' && error && <span className="text-sm text-destructive">{error}</span>}
      </div>
    </form>
  );
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function numOrNull(v: string): number | null {
  const n = Number.parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

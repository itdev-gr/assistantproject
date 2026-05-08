'use client';

import { useState } from 'react';
import { useRouter } from '@/i18n/routing';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { hotelProfileSchema, subscriptionTierSchema } from '@aga/api-contracts';
import { Button, Input, Label, Card, CardContent } from '@aga/ui';
import { createTenant } from '@/app/actions/admin-tenants';

const formSchema = hotelProfileSchema.extend({
  ownerEmail: z.string().email(),
  subscriptionTier: subscriptionTierSchema,
});
type FormValues = z.infer<typeof formSchema>;

interface Props {
  locale: string;
}

export function NewTenantForm({ locale }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      slug: '',
      timezone: 'Europe/Athens',
      defaultLocale: 'el',
      lat: null,
      lng: null,
      brand: { logoUrl: null, primaryColor: null },
      ownerEmail: '',
      subscriptionTier: 'standard',
    },
  });

  async function onSubmit(values: FormValues) {
    setError(null);
    const r = await createTenant(values);
    if (r.ok) router.push('/admin');
    else setError(r.error);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Card>
        <CardContent className="space-y-4 p-6">
          <Field id="name" label={locale === 'en' ? 'Name' : 'Όνομα'} error={errors.name?.message}>
            <Input id="name" {...register('name')} />
          </Field>
          <Field id="slug" label="Slug" error={errors.slug?.message}>
            <Input id="slug" placeholder="aegean-blue" {...register('slug')} />
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
              id="subscriptionTier"
              label={locale === 'en' ? 'Subscription tier' : 'Επίπεδο συνδρομής'}
              error={errors.subscriptionTier?.message}
            >
              <select
                id="subscriptionTier"
                {...register('subscriptionTier')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="free">free</option>
                <option value="standard">standard</option>
                <option value="featured">featured</option>
                <option value="exclusive">exclusive</option>
              </select>
            </Field>
          </div>
          <Field
            id="ownerEmail"
            label={locale === 'en' ? 'Owner email (will be invited)' : 'Email ιδιοκτήτη (θα προσκληθεί)'}
            error={errors.ownerEmail?.message}
          >
            <Input id="ownerEmail" type="email" {...register('ownerEmail')} />
          </Field>
        </CardContent>
      </Card>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? locale === 'en'
              ? 'Creating…'
              : 'Δημιουργία…'
            : locale === 'en'
              ? 'Create'
              : 'Δημιουργία'}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push('/admin')}>
          {locale === 'en' ? 'Cancel' : 'Ακύρωση'}
        </Button>
        {error && <span className="text-sm text-destructive">{error}</span>}
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

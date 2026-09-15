'use client';

import { useState } from 'react';
import { useRouter } from '@/i18n/routing';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { hotelPlanSchema, hotelProfileSchema } from '@aga/api-contracts';
import { HOTEL_PLANS } from '@/lib/hotel-plans';
import { formatEuro } from '@/lib/plans';
import { Button, Input, Label, Card, CardContent } from '@aga/ui';
import { createTenant } from '@/app/actions/admin-tenants';

const formSchema = hotelProfileSchema.extend({
  ownerEmail: z.string().email(),
  plan: hotelPlanSchema,
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
      plan: 'basic',
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
              id="plan"
              label={locale === 'en' ? 'Package' : 'Πακέτο'}
              error={errors.plan?.message}
            >
              <select
                id="plan"
                {...register('plan')}
                className="border-input bg-background flex h-10 w-full rounded-md border px-3 py-2 text-sm"
              >
                {HOTEL_PLANS.map((p) => (
                  <option key={p.plan} value={p.plan}>
                    {(locale === 'en' ? p.name.en : p.name.el) +
                      ' · ' +
                      formatEuro(p.cents, locale) +
                      (locale === 'en' ? '/year' : '/έτος')}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field
            id="ownerEmail"
            label={
              locale === 'en' ? 'Owner email (will be invited)' : 'Email ιδιοκτήτη (θα προσκληθεί)'
            }
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
        {error && <span className="text-destructive text-sm">{error}</span>}
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
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
}

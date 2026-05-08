'use client';

import { useState } from 'react';
import { useRouter } from '@/i18n/routing';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { hotelProfileSchema, subscriptionTierSchema, uuidSchema } from '@aga/api-contracts';
import { Button, Input, Label, Card, CardContent } from '@aga/ui';
import { updateTenant } from '@/app/actions/admin-tenants';

const formSchema = hotelProfileSchema.extend({
  id: uuidSchema,
  subscriptionTier: subscriptionTierSchema,
  active: z.boolean(),
});
type FormValues = z.infer<typeof formSchema>;

interface Props {
  locale: string;
  initial: FormValues;
}

export function TenantEditForm({ locale, initial }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initial,
  });

  async function onSubmit(values: FormValues) {
    setStatus('saving');
    setError(null);
    const r = await updateTenant(values);
    if (r.ok) {
      setStatus('saved');
      router.refresh();
    } else {
      setStatus('error');
      setError(r.error);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Card>
        <CardContent className="space-y-4 p-6">
          <input type="hidden" {...register('id')} />
          <div className="grid gap-4 md:grid-cols-2">
            <Field id="name" label={locale === 'en' ? 'Name' : 'Όνομα'} error={errors.name?.message}>
              <Input id="name" {...register('name')} />
            </Field>
            <Field id="slug" label="Slug" error={errors.slug?.message}>
              <Input id="slug" {...register('slug')} />
            </Field>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
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
            <Field
              id="defaultLocale"
              label={locale === 'en' ? 'Default language' : 'Προεπιλεγμένη γλώσσα'}
              error={errors.defaultLocale?.message}
            >
              <select
                id="defaultLocale"
                {...register('defaultLocale')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="el">Ελληνικά</option>
                <option value="en">English</option>
              </select>
            </Field>
          </div>
          <Field
            id="timezone"
            label={locale === 'en' ? 'Timezone' : 'Ζώνη ώρας'}
            error={errors.timezone?.message}
          >
            <Input id="timezone" {...register('timezone')} />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...register('active')} />
            {locale === 'en' ? 'Active' : 'Ενεργό'}
          </label>
        </CardContent>
      </Card>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={!isDirty || status === 'saving'}>
          {locale === 'en' ? 'Save' : 'Αποθήκευση'}
        </Button>
        {status === 'saved' && (
          <span className="text-sm text-muted-foreground">
            {locale === 'en' ? 'Saved' : 'Αποθηκεύτηκε'}
          </span>
        )}
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

'use client';

import { useState } from 'react';
import { useRouter } from '@/i18n/routing';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { businessUpsertSchema, type BusinessUpsert } from '@aga/api-contracts';
import { Button, Input, Label, Card, CardContent, Textarea } from '@aga/ui';
import { upsertBusiness, deleteBusiness } from '@/app/actions/admin-businesses';

interface CategoryOpt {
  id: string;
  slug: string;
  label: string;
}

interface Props {
  locale: string;
  categories: CategoryOpt[];
  initial: BusinessUpsert;
}

export function BusinessForm({ locale, categories, initial }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<BusinessUpsert>({
    resolver: zodResolver(businessUpsertSchema),
    defaultValues: initial,
  });

  async function onSubmit(values: BusinessUpsert) {
    setError(null);
    const r = await upsertBusiness({
      ...values,
      tags:
        typeof (values.tags as unknown) === 'string'
          ? (values.tags as unknown as string)
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          : values.tags,
    });
    if (r.ok) router.push('/admin/businesses');
    else setError(r.error);
  }

  async function onDelete() {
    if (!initial.id) return;
    if (!confirm(locale === 'en' ? 'Delete this business?' : 'Διαγραφή;')) return;
    const r = await deleteBusiness({ id: initial.id });
    if (r.ok) router.push('/admin/businesses');
    else setError(r.error ?? 'error');
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Field id="name" label={locale === 'en' ? 'Name' : 'Όνομα'} error={errors.name?.message}>
              <Input id="name" {...register('name')} />
            </Field>
            <Field
              id="categoryId"
              label={locale === 'en' ? 'Category' : 'Κατηγορία'}
              error={errors.categoryId?.message}
            >
              <select
                id="categoryId"
                {...register('categoryId')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field
            id="address"
            label={locale === 'en' ? 'Address' : 'Διεύθυνση'}
            error={errors.address?.message}
          >
            <Input id="address" {...register('address')} />
          </Field>

          <div className="grid gap-4 md:grid-cols-2">
            <Field id="lat" label="Latitude" error={errors.lat?.message}>
              <Input id="lat" type="number" step="0.0001" {...register('lat', { valueAsNumber: true })} />
            </Field>
            <Field id="lng" label="Longitude" error={errors.lng?.message}>
              <Input id="lng" type="number" step="0.0001" {...register('lng', { valueAsNumber: true })} />
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Field id="phone" label="Phone" error={errors.phone?.message}>
              <Input id="phone" {...register('phone')} />
            </Field>
            <Field id="whatsapp" label="WhatsApp" error={errors.whatsapp?.message}>
              <Input id="whatsapp" {...register('whatsapp')} />
            </Field>
            <Field id="website" label="Website" error={errors.website?.message}>
              <Input id="website" placeholder="https://…" {...register('website')} />
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field
              id="priceBand"
              label={locale === 'en' ? 'Price band (1-4)' : 'Επίπεδο τιμής (1-4)'}
              error={errors.priceBand?.message}
            >
              <Input
                id="priceBand"
                type="number"
                min={1}
                max={4}
                {...register('priceBand', { valueAsNumber: true })}
              />
            </Field>
            <Field id="tags" label={locale === 'en' ? 'Tags (comma separated)' : 'Ετικέτες'}>
              <Input id="tags" {...register('tags')} />
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field
              id="descEl"
              label={locale === 'en' ? 'Description (Greek)' : 'Περιγραφή (Ελληνικά)'}
            >
              <Textarea id="descEl" rows={3} {...register('description.el')} />
            </Field>
            <Field
              id="descEn"
              label={locale === 'en' ? 'Description (English)' : 'Περιγραφή (Αγγλικά)'}
            >
              <Textarea id="descEn" rows={3} {...register('description.en')} />
            </Field>
          </div>

          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...register('verified')} />
              {locale === 'en' ? 'Verified' : 'Εγκεκριμένη'}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...register('active')} />
              {locale === 'en' ? 'Active' : 'Ενεργή'}
            </label>
          </div>
        </CardContent>
      </Card>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {locale === 'en' ? 'Save' : 'Αποθήκευση'}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push('/admin/businesses')}>
          {locale === 'en' ? 'Cancel' : 'Ακύρωση'}
        </Button>
        {initial.id && (
          <Button type="button" variant="ghost" onClick={onDelete}>
            {locale === 'en' ? 'Delete' : 'Διαγραφή'}
          </Button>
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

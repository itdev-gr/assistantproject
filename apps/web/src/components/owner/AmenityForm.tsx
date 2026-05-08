'use client';

import { useState } from 'react';
import { useRouter } from '@/i18n/routing';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { amenityUpsertSchema, type AmenityUpsert } from '@aga/api-contracts';
import { Button, Input, Textarea, Label, Card, CardContent } from '@aga/ui';
import { upsertAmenity } from '@/app/actions/owner-amenities';

interface Props {
  locale: string;
  initial: AmenityUpsert;
}

export function AmenityForm({ locale, initial }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AmenityUpsert>({
    resolver: zodResolver(amenityUpsertSchema),
    defaultValues: initial,
  });

  async function onSubmit(values: AmenityUpsert) {
    setError(null);
    const r = await upsertAmenity(values);
    if (r.ok) router.push('/owner/amenities');
    else setError(r.error);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="space-y-1.5">
            <Label htmlFor="name">{locale === 'en' ? 'Name' : 'Όνομα'}</Label>
            <Input id="name" {...register('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">{locale === 'en' ? 'Description' : 'Περιγραφή'}</Label>
            <Textarea id="description" rows={4} {...register('description')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="locationOnProperty">
              {locale === 'en' ? 'Location' : 'Σημείο στο κατάλυμα'}
            </Label>
            <Input id="locationOnProperty" {...register('locationOnProperty')} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...register('published')} />
            {locale === 'en' ? 'Published' : 'Δημοσιευμένο'}
          </label>
        </CardContent>
      </Card>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {locale === 'en' ? 'Save' : 'Αποθήκευση'}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push('/owner/amenities')}>
          {locale === 'en' ? 'Cancel' : 'Ακύρωση'}
        </Button>
        {error && <span className="text-sm text-destructive">{error}</span>}
      </div>
    </form>
  );
}

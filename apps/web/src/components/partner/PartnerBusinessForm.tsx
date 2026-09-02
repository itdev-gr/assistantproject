'use client';

import { useState } from 'react';
import { useRouter } from '@/i18n/routing';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { partnerBusinessUpdateSchema, type PartnerBusinessUpdate } from '@aga/api-contracts';
import { Button, Input, Label, Card, CardContent, Textarea } from '@aga/ui';
import { updateMyBusiness } from '@/app/actions/partner-business';
import { ImageUploader } from '@/components/admin/ImageUploader';
import { Field, OpeningHoursEditor } from '@/components/admin/business-form-parts';

interface Props {
  locale: string;
  initial: PartnerBusinessUpdate;
}

export function PartnerBusinessForm({ locale, initial }: Props) {
  const router = useRouter();
  const t = (en: string, el: string) => (locale === 'en' ? en : el);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<PartnerBusinessUpdate>({
    resolver: zodResolver(partnerBusinessUpdateSchema),
    defaultValues: initial,
  });

  async function onSubmit(values: PartnerBusinessUpdate) {
    setMessage(null);
    const tags =
      typeof (values.tags as unknown) === 'string'
        ? (values.tags as unknown as string)
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : values.tags;
    const blankToNull = (v: string | null | undefined) => (v == null || v === '' ? null : v);
    const description =
      values.description && Object.values(values.description).some((v) => v)
        ? values.description
        : null;
    const r = await updateMyBusiness({
      ...values,
      phone: blankToNull(values.phone),
      whatsapp: blankToNull(values.whatsapp),
      website: blankToNull(values.website),
      description,
      tags,
    });
    if (r.ok) {
      setMessage({ kind: 'ok', text: t('Saved.', 'Αποθηκεύτηκε.') });
      router.refresh();
    } else {
      setMessage({ kind: 'error', text: r.error });
    }
  }

  const errorList = Object.entries(errors)
    .map(([field, e]) => {
      const msg = (e as { message?: string } | undefined)?.message;
      return msg ? `${field}: ${msg}` : null;
    })
    .filter((s): s is string => s !== null);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {errorList.length > 0 && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
          <p className="font-medium">{t('Please fix:', 'Διορθώστε:')}</p>
          <ul className="mt-1 list-disc pl-5">
            {errorList.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      )}
      <Card>
        <CardContent className="space-y-4 p-6">
          <Field id="name" label={t('Name', 'Όνομα')} error={errors.name?.message}>
            <Input id="name" {...register('name')} />
          </Field>

          <div className="grid gap-4 md:grid-cols-3">
            <Field id="phone" label={t('Phone', 'Τηλέφωνο')} error={errors.phone?.message}>
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
              label={t('Price band (1-4)', 'Επίπεδο τιμής (1-4)')}
              error={errors.priceBand?.message}
            >
              <Input id="priceBand" type="number" min={1} max={4} {...register('priceBand', { valueAsNumber: true })} />
            </Field>
            <Field id="tags" label={t('Tags (comma separated)', 'Ετικέτες (με κόμμα)')}>
              <Input id="tags" {...register('tags')} />
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field id="descEl" label={t('Description (Greek)', 'Περιγραφή (Ελληνικά)')}>
              <Textarea id="descEl" rows={4} {...register('description.el')} />
            </Field>
            <Field id="descEn" label={t('Description (English)', 'Περιγραφή (Αγγλικά)')}>
              <Textarea id="descEn" rows={4} {...register('description.en')} />
            </Field>
          </div>

          <div className="space-y-2">
            <Label>{t('Photos', 'Φωτογραφίες')}</Label>
            <Controller
              control={control}
              name="images"
              render={({ field }) => (
                <ImageUploader
                  locale={locale}
                  pathPrefix={initial.id}
                  value={(field.value ?? []) as string[]}
                  onChange={(next) => field.onChange(next)}
                />
              )}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('Opening hours', 'Ωράριο')}</Label>
            <Controller
              control={control}
              name="openingHours"
              render={({ field }) => (
                <OpeningHoursEditor value={field.value} onChange={field.onChange} />
              )}
            />
          </div>
        </CardContent>
      </Card>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {t('Save', 'Αποθήκευση')}
        </Button>
        {message && (
          <span className={message.kind === 'ok' ? 'text-sm text-olive' : 'text-sm text-destructive'}>
            {message.text}
          </span>
        )}
      </div>
    </form>
  );
}

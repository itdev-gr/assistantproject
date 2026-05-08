'use client';

import { useState } from 'react';
import { useRouter } from '@/i18n/routing';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { faqUpsertSchema, type FaqUpsert } from '@aga/api-contracts';
import { Button, Input, Textarea, Label, Card, CardContent } from '@aga/ui';
import { upsertFaq } from '@/app/actions/owner-faqs';

const INTENTS = [
  'ask_checkin',
  'ask_checkout',
  'ask_wifi',
  'ask_breakfast',
  'ask_amenity_hours',
  'ask_policy',
  'ask_room_info',
  'recommend_taxi',
] as const;

interface Props {
  locale: string;
  initial: FaqUpsert;
}

export function FaqForm({ locale, initial }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FaqUpsert>({
    resolver: zodResolver(faqUpsertSchema),
    defaultValues: {
      ...initial,
      tags: initial.tags ?? [],
    },
  });

  async function onSubmit(values: FaqUpsert) {
    setError(null);
    const result = await upsertFaq({
      ...values,
      tags: typeof (values.tags as unknown) === 'string'
        ? (values.tags as unknown as string).split(',').map((s) => s.trim()).filter(Boolean)
        : values.tags,
    });
    if (result.ok) {
      router.push('/owner/faqs');
    } else {
      setError(result.error);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="locale">{locale === 'en' ? 'Language' : 'Γλώσσα'}</Label>
              <select
                id="locale"
                {...register('locale')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="el">Ελληνικά</option>
                <option value="en">English</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="intentSlug">Intent</Label>
              <select
                id="intentSlug"
                {...register('intentSlug')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">{locale === 'en' ? '(no intent)' : '(χωρίς intent)'}</option>
                {INTENTS.map((i) => (
                  <option key={i} value={i}>
                    {i}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="question">{locale === 'en' ? 'Question' : 'Ερώτηση'}</Label>
            <Input id="question" {...register('question')} />
            {errors.question && <p className="text-xs text-destructive">{errors.question.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="answer">{locale === 'en' ? 'Answer' : 'Απάντηση'}</Label>
            <Textarea id="answer" rows={6} {...register('answer')} />
            {errors.answer && <p className="text-xs text-destructive">{errors.answer.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tags">{locale === 'en' ? 'Tags (comma separated)' : 'Ετικέτες (χωρισμένες με κόμμα)'}</Label>
            <Input id="tags" {...register('tags')} />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...register('published')} />
            {locale === 'en' ? 'Published — visible to guests' : 'Δημοσιευμένο — ορατό σε επισκέπτες'}
          </label>
        </CardContent>
      </Card>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? locale === 'en'
              ? 'Saving…'
              : 'Αποθήκευση…'
            : locale === 'en'
              ? 'Save'
              : 'Αποθήκευση'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push('/owner/faqs')}
        >
          {locale === 'en' ? 'Cancel' : 'Ακύρωση'}
        </Button>
        {error && <span className="text-sm text-destructive">{error}</span>}
      </div>
    </form>
  );
}

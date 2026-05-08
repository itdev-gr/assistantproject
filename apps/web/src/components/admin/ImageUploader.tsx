'use client';

import { useRef, useState, useTransition } from 'react';
import { Button } from '@aga/ui';
import { ImagePlus, X, Loader2 } from 'lucide-react';
import { createSupabaseBrowserClient } from '@aga/db/browser';

interface Props {
  value: string[];
  onChange: (next: string[]) => void;
  pathPrefix: string;
  locale: string;
  disabled?: boolean;
}

const BUCKET = 'business-images';

export function ImageUploader({ value, onChange, pathPrefix, locale, disabled }: Props) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const t = (en: string, el: string) => (locale === 'en' ? en : el);

  function pick() {
    fileInput.current?.click();
  }

  function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setError(null);
    start(async () => {
      const supabase = createSupabaseBrowserClient();
      const uploaded: string[] = [];
      for (const file of files) {
        const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
        const safe = `${pathPrefix}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from(BUCKET).upload(safe, file, {
          contentType: file.type || `image/${ext}`,
          cacheControl: '3600',
        });
        if (upErr) {
          setError(upErr.message);
          continue;
        }
        const { data } = supabase.storage.from(BUCKET).getPublicUrl(safe);
        uploaded.push(data.publicUrl);
      }
      if (uploaded.length > 0) onChange([...value, ...uploaded]);
      if (fileInput.current) fileInput.current.value = '';
    });
  }

  function remove(url: string) {
    onChange(value.filter((u) => u !== url));
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {value.map((url) => (
          <div
            key={url}
            className="group relative aspect-[4/3] overflow-hidden rounded-md border bg-muted"
          >
            <img src={url} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => remove(url)}
              className="absolute right-1.5 top-1.5 rounded-full bg-background/90 p-1 opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
              aria-label={t('Remove image', 'Αφαίρεση εικόνας')}
            >
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={pick}
          disabled={disabled || pending}
          className="flex aspect-[4/3] flex-col items-center justify-center gap-1.5 rounded-md border border-dashed bg-muted/30 text-xs text-muted-foreground transition-colors hover:bg-muted/60 disabled:opacity-50"
        >
          {pending ? (
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          ) : (
            <ImagePlus className="h-5 w-5" aria-hidden />
          )}
          <span>
            {pending
              ? t('Uploading…', 'Μεταφόρτωση…')
              : t('Add images', 'Προσθήκη εικόνων')}
          </span>
        </button>
      </div>
      <input
        ref={fileInput}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        onChange={onFiles}
        className="hidden"
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <p className="text-xs text-muted-foreground">
        {t(
          'JPEG, PNG, WEBP or GIF · 5 MB max each',
          'JPEG, PNG, WEBP ή GIF · έως 5 MB ανά αρχείο',
        )}
      </p>
    </div>
  );
}

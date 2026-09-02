'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from '@/i18n/routing';
import { Button, Input, Label } from '@aga/ui';
import { Loader2, Upload } from 'lucide-react';
import { createSupabaseBrowserClient } from '@aga/db/browser';
import { updateProfile } from '@/app/actions/auth';
import { dashSelect } from '@/components/dashboard/field-classes';

interface Props {
  locale: string;
  userId: string;
  email: string;
  initial: { displayName: string | null; avatarUrl: string | null; locale: 'el' | 'en' };
}

export function ProfileForm({ locale, userId, email, initial }: Props) {
  const router = useRouter();
  const t = (en: string, el: string) => (locale === 'en' ? en : el);
  const [displayName, setDisplayName] = useState(initial.displayName ?? '');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initial.avatarUrl);
  const [prefLocale, setPrefLocale] = useState<'el' | 'en'>(initial.locale);
  const [pending, start] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setMessage(null);
    setUploading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from('avatars')
        .upload(path, file, { contentType: file.type || `image/${ext}`, cacheControl: '3600' });
      if (error) {
        setMessage({ kind: 'error', text: error.message });
        return;
      }
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      setAvatarUrl(data.publicUrl);
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    start(async () => {
      const r = await updateProfile({
        displayName: displayName.trim() || null,
        avatarUrl,
        locale: prefLocale,
      });
      if (r.ok) {
        setMessage({ kind: 'ok', text: t('Saved.', 'Αποθηκεύτηκε.') });
        router.refresh();
      } else {
        setMessage({ kind: 'error', text: r.error });
      }
    });
  }

  const initials = (displayName || email).slice(0, 1).toUpperCase();

  return (
    <form onSubmit={save} className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full bg-primary/10 text-xl font-semibold text-primary">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span aria-hidden>{initials}</span>
          )}
        </div>
        <div className="space-y-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => fileInput.current?.click()}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Upload className="h-4 w-4" aria-hidden />
            )}
            {t('Change photo', 'Αλλαγή φωτογραφίας')}
          </Button>
          {avatarUrl && (
            <button
              type="button"
              onClick={() => setAvatarUrl(null)}
              className="block text-xs text-muted-foreground hover:text-destructive"
            >
              {t('Remove photo', 'Αφαίρεση φωτογραφίας')}
            </button>
          )}
          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={onFile}
            className="hidden"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="displayName">{t('Name', 'Όνομα')}</Label>
        <Input
          id="displayName"
          maxLength={80}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" value={email} disabled />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="locale">{t('Preferred language', 'Προτιμώμενη γλώσσα')}</Label>
        <select
          id="locale"
          value={prefLocale}
          onChange={(e) => setPrefLocale(e.target.value === 'en' ? 'en' : 'el')}
          className={dashSelect}
        >
          <option value="el">Ελληνικά</option>
          <option value="en">English</option>
        </select>
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending || uploading}>
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

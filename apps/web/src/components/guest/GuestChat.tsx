'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useConversation } from '@aga/chat';
import { Button, Input, Card, CardContent, Badge } from '@aga/ui';
import { Send } from 'lucide-react';

interface Props {
  hotelSlug: string;
}

export function GuestChat({ hotelSlug }: Props) {
  const t = useTranslations('guest.chat');
  const tFb = useTranslations('guest.fallback');
  const [input, setInput] = useState('');
  const { messages, status, send } = useConversation({ hotelSlug });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || status === 'sending') return;
    const text = input;
    setInput('');
    await send(text);
  }

  return (
    <div className="flex flex-1 flex-col">
      <ol className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <li className="text-center text-sm text-muted-foreground">{t('placeholder')}</li>
        )}
        {messages.map((m) => (
          <li
            key={m.id}
            className={m.role === 'guest' ? 'flex justify-end' : 'flex justify-start'}
          >
            <Card
              className={
                m.role === 'guest'
                  ? 'max-w-[80%] bg-primary text-primary-foreground'
                  : 'max-w-[80%]'
              }
            >
              <CardContent className="p-3 text-sm">{m.content}</CardContent>
            </Card>
          </li>
        ))}
        {status === 'sending' && (
          <li className="text-center text-xs text-muted-foreground">{t('thinking')}</li>
        )}
        {status === 'error' && (
          <li className="text-center text-xs text-destructive">{tFb('noInfo')}</li>
        )}
      </ol>

      <form
        onSubmit={onSubmit}
        className="flex items-center gap-2 border-t bg-background p-3"
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t('placeholder')}
          aria-label={t('placeholder')}
          disabled={status === 'sending'}
        />
        <Button type="submit" size="icon" disabled={!input.trim() || status === 'sending'}>
          <Send className="h-4 w-4" aria-hidden />
          <span className="sr-only">{t('send')}</span>
        </Button>
      </form>
      <p className="px-3 pb-2 text-[10px] text-muted-foreground">
        <Badge variant="promoted" className="mr-1">
          {t('promotedBadge')}
        </Badge>
        Hotel: {hotelSlug}
      </p>
    </div>
  );
}

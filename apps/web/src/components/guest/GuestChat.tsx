'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useConversation, type ConversationMessage } from '@aga/chat';
import type { RecommendationCard } from '@aga/api-contracts';
import { formatDistanceKm } from '@aga/i18n';
import { Button, Input, Card, CardContent, Badge, cn } from '@aga/ui';
import { Send, ExternalLink, MapPin } from 'lucide-react';

interface Props {
  hotelSlug: string;
}

export function GuestChat({ hotelSlug }: Props) {
  const t = useTranslations('guest.chat');
  const tFb = useTranslations('guest.fallback');
  const [input, setInput] = useState('');
  const { messages, status, send } = useConversation({ hotelSlug });
  const messagesEndRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages, status]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || status === 'sending') return;
    const text = input;
    setInput('');
    await send(text);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ol className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <li className="pt-12 text-center text-sm text-muted-foreground">{t('placeholder')}</li>
        )}
        {messages.map((m) => (
          <MessageRow key={m.id} message={m} />
        ))}
        {status === 'sending' && (
          <li className="text-center text-xs text-muted-foreground">{t('thinking')}</li>
        )}
        {status === 'error' && (
          <li className="text-center text-xs text-destructive">{tFb('noInfo')}</li>
        )}
        <li ref={messagesEndRef} aria-hidden className="h-px" />
      </ol>

      <form onSubmit={onSubmit} className="flex items-center gap-2 border-t bg-background p-3">
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
    </div>
  );
}

function MessageRow({ message }: { message: ConversationMessage }) {
  const isGuest = message.role === 'guest';
  return (
    <li className={cn('flex flex-col gap-2', isGuest ? 'items-end' : 'items-start')}>
      {message.content && (
        <Card className={cn('max-w-[85%]', isGuest && 'bg-primary text-primary-foreground')}>
          <CardContent className="p-3 text-sm">{message.content}</CardContent>
        </Card>
      )}
      {message.recommendations && message.recommendations.length > 0 && (
        <div className="flex w-full max-w-[85%] flex-col gap-2">
          {message.recommendations.map((r) => (
            <RecommendationCardView key={r.businessId} card={r} />
          ))}
        </div>
      )}
    </li>
  );
}

function RecommendationCardView({ card }: { card: RecommendationCard }) {
  const t = useTranslations('guest.chat');
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-semibold">{card.name}</p>
              {card.promoted && (
                <Badge variant="promoted" className="shrink-0 text-[10px]">
                  {t('promotedBadge')}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {card.category}
              {card.distanceKm != null && (
                <>
                  {' · '}
                  <MapPin className="inline h-3 w-3" aria-hidden /> {formatDistanceKm(card.distanceKm, 'el')}
                </>
              )}
              {card.openNow != null && (
                <>
                  {' · '}
                  <span className={card.openNow ? 'text-emerald-600' : 'text-muted-foreground'}>
                    {card.openNow ? t('openNow') : t('closedNow')}
                  </span>
                </>
              )}
            </p>
            {card.description && (
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{card.description}</p>
            )}
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <Button asChild size="sm">
            <a href={card.referralUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              {t('viewMore')}
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

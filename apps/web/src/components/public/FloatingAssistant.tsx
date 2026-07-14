'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, MotionConfig } from 'framer-motion';
import { MessageCircle, Send, X } from 'lucide-react';
import { useConversation, type ConversationMessage } from '@aga/chat';
import type { RecommendationCard } from '@aga/api-contracts';
import { Badge, Button, cn } from '@aga/ui';

interface Props {
  locale: string;
  hotelSlug: string;
  title?: string;
}

export function FloatingAssistant({ locale, hotelSlug, title }: Props) {
  const t = (en: string, el: string) => (locale === 'en' ? en : el);
  const resolvedTitle = title ?? t('Local Guide assistant', 'Βοηθός Τοπικού Οδηγού');

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Computed once — subsequent re-renders reuse the same welcome message.
  const [welcomeMessage] = useState<ConversationMessage>(() => ({
    id: crypto.randomUUID(),
    role: 'assistant',
    content: t(
      'Hi! Ask me anything about the hotel or the island — restaurants, beaches, activities…',
      'Γεια σας! Ρωτήστε με ό,τι θέλετε για το ξενοδοχείο ή το νησί — εστιατόρια, παραλίες, δραστηριότητες…',
    ),
    intent: null,
    createdAt: new Date().toISOString(),
  }));

  const { messages, status, error, send } = useConversation({
    hotelSlug,
    initial: [welcomeMessage],
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, status]);

  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => inputRef.current?.focus(), 150);
    return () => window.clearTimeout(id);
  }, [open]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || status === 'sending') return;
    const text = input;
    setInput('');
    await send(text);
  }

  return (
    <MotionConfig reducedMotion="user">
      <motion.button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? t('Close assistant', 'Κλείσιμο βοηθού') : t('Open assistant', 'Άνοιγμα βοηθού')}
        aria-expanded={open}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-4 left-4 z-40 flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {open ? <X className="h-6 w-6" aria-hidden /> : <MessageCircle className="h-6 w-6" aria-hidden />}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label={resolvedTitle}
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className={cn(
              'fixed z-40 flex flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl',
              'bottom-24 left-4 h-[560px] w-[370px] max-h-[75dvh]',
              'max-sm:inset-x-2 max-sm:bottom-20 max-sm:h-[70dvh] max-sm:w-auto',
            )}
          >
            <div className="shrink-0 bg-sky-950 p-4 text-white">
              <p className="font-serif text-base">{resolvedTitle}</p>
              <p className="text-xs text-sky-200/80">
                {t('Ask about the hotel and the island', 'Ρωτήστε για το ξενοδοχείο και το νησί')}
              </p>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-3" aria-live="polite">
              {messages.map((m) => (
                <MessageBubble key={m.id} message={m} locale={locale} />
              ))}
              {status === 'sending' && <TypingIndicator locale={locale} />}
              {error && (
                <p className="text-xs text-destructive/80">
                  {t(
                    'Something went wrong — please try again in a few minutes.',
                    'Κάτι πήγε στραβά — δοκιμάστε ξανά σε λίγα λεπτά.',
                  )}
                </p>
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={onSubmit} className="flex shrink-0 gap-2 border-t p-3">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t('Type a message…', 'Γράψτε ένα μήνυμα…')}
                aria-label={t('Message the assistant', 'Μήνυμα προς τον βοηθό')}
                className="h-11 flex-1 rounded-full border border-input bg-background px-4 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                disabled={status === 'sending'}
              />
              <Button
                type="submit"
                size="icon"
                disabled={status === 'sending' || !input.trim()}
                className="h-11 w-11 shrink-0 cursor-pointer rounded-full"
              >
                <Send className="h-4 w-4" aria-hidden />
                <span className="sr-only">{t('Send', 'Αποστολή')}</span>
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </MotionConfig>
  );
}

function MessageBubble({ message, locale }: { message: ConversationMessage; locale: string }) {
  const isGuest = message.role === 'guest';
  return (
    <div className={cn('flex flex-col gap-2', isGuest ? 'items-end' : 'items-start')}>
      {message.content && (
        <div
          className={cn(
            'max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm',
            isGuest
              ? 'rounded-br-sm bg-primary text-primary-foreground'
              : 'rounded-bl-sm bg-muted text-foreground',
          )}
        >
          {message.content}
        </div>
      )}
      {message.recommendations && message.recommendations.length > 0 && (
        <div className="flex w-full max-w-[85%] flex-col gap-2">
          {message.recommendations.map((r) => (
            <RecommendationRow key={r.businessId} card={r} locale={locale} />
          ))}
        </div>
      )}
    </div>
  );
}

function RecommendationRow({ card, locale }: { card: RecommendationCard; locale: string }) {
  const t = (en: string, el: string) => (locale === 'en' ? en : el);
  return (
    <div className="rounded-lg border p-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="line-clamp-1 text-sm font-medium">{card.name}</p>
            {card.promoted && (
              <Badge variant="promoted" className="shrink-0 text-[10px]">
                {t('Featured', 'Προτεινόμενο')}
              </Badge>
            )}
          </div>
          <p className="line-clamp-1 text-xs text-muted-foreground">{card.category}</p>
          {card.description && (
            <p className="line-clamp-1 text-xs text-muted-foreground">{card.description}</p>
          )}
        </div>
        <a
          href={card.referralUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 cursor-pointer rounded px-1 py-1 text-xs font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {t('View', 'Προβολή')}
        </a>
      </div>
    </div>
  );
}

function TypingIndicator({ locale }: { locale: string }) {
  const t = (en: string, el: string) => (locale === 'en' ? en : el);
  return (
    <div className="flex w-fit items-center gap-1 rounded-2xl rounded-bl-sm bg-muted px-3 py-2.5">
      <span className="sr-only">{t('Assistant is typing…', 'Ο βοηθός γράφει…')}</span>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          aria-hidden
          className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60"
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

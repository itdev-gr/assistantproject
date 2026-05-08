import { useCallback, useState } from 'react';
import type { ChatMessage, ChatRequest, ChatResponse, ChatStatus } from './types.js';

export interface UseConversationOptions {
  /** Override the API endpoint. Defaults to /api/chat */
  endpoint?: string;
  /** Initial messages (e.g. system welcome) */
  initial?: ChatMessage[];
  /** Hotel slug — required */
  hotelSlug: string;
}

export interface UseConversationResult {
  messages: ChatMessage[];
  status: ChatStatus;
  error: Error | null;
  send: (text: string) => Promise<void>;
  reset: () => void;
}

export function useConversation({
  endpoint = '/api/chat',
  initial = [],
  hotelSlug,
}: UseConversationOptions): UseConversationResult {
  const [messages, setMessages] = useState<ChatMessage[]>(initial);
  const [status, setStatus] = useState<ChatStatus>('idle');
  const [error, setError] = useState<Error | null>(null);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      const guestMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'guest',
        content: trimmed,
        intent: null,
        createdAt: new Date().toISOString(),
      };
      setMessages((m) => [...m, guestMsg]);
      setStatus('sending');
      setError(null);

      try {
        const body: ChatRequest = { hotelSlug, message: trimmed };
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error(`Chat request failed: ${res.status}`);
        const data = (await res.json()) as ChatResponse;
        setMessages((m) => [
          ...m,
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: data.reply,
            intent: data.intent,
            createdAt: new Date().toISOString(),
          },
        ]);
        setStatus('idle');
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        setStatus('error');
      }
    },
    [endpoint, hotelSlug],
  );

  const reset = useCallback(() => {
    setMessages(initial);
    setStatus('idle');
    setError(null);
  }, [initial]);

  return { messages, status, error, send, reset };
}

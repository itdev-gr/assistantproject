import { useState } from 'preact/hooks';
import type { ChatMessage } from '@aga/api-contracts';
import { sendChat } from './api';
import { M } from './messages';

interface Props {
  hotelSlug: string;
  origin: string;
}

export function ChatPanel({ hotelSlug, origin }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: Event) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setInput('');
    setBusy(true);
    const id = crypto.randomUUID();
    setMessages((m) => [
      ...m,
      { id, role: 'guest', content: text, intent: null, createdAt: new Date().toISOString() },
    ]);
    try {
      const res = await sendChat(origin, { hotelSlug, message: text });
      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: res.reply,
          intent: res.intent,
          createdAt: new Date().toISOString(),
        },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: M.noInfo,
          intent: 'out_of_scope',
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="aga-chat">
      <style>{styles}</style>
      <ol className="aga-msgs">
        {messages.map((m) => (
          <li key={m.id} className={'aga-msg ' + m.role}>
            {m.content}
          </li>
        ))}
        {busy && <li className="aga-thinking">{M.thinking}</li>}
      </ol>
      <form onSubmit={submit} className="aga-form">
        <input
          value={input}
          onInput={(e) => setInput((e.target as HTMLInputElement).value)}
          placeholder={M.placeholder}
          aria-label={M.placeholder}
          disabled={busy}
        />
        <button type="submit" disabled={busy || !input.trim()}>
          {M.send}
        </button>
      </form>
    </div>
  );
}

const styles = `
  .aga-chat { display: flex; flex-direction: column; flex: 1; min-height: 0; }
  .aga-msgs { list-style: none; padding: 12px; margin: 0; flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; }
  .aga-msg { padding: 8px 12px; border-radius: 12px; max-width: 85%; font-size: 14px; line-height: 1.4; }
  .aga-msg.guest { align-self: flex-end; background: #0c8ec5; color: #fff; border-bottom-right-radius: 4px; }
  .aga-msg.assistant { align-self: flex-start; background: #f1f5f9; color: #0f172a; border-bottom-left-radius: 4px; }
  .aga-thinking { color: #6b7280; font-size: 12px; padding: 4px 12px; }
  .aga-form { display: flex; gap: 8px; padding: 10px; border-top: 1px solid #eee; }
  .aga-form input { flex: 1; padding: 8px 10px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; }
  .aga-form button { padding: 8px 14px; background: #0c8ec5; color: #fff; border: 0; border-radius: 8px; cursor: pointer; font-size: 14px; }
  .aga-form button:disabled { opacity: 0.5; cursor: not-allowed; }
`;

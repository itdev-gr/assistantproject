/**
 * Pure assembly of the OpenAI chat-completions message array for the
 * per-hotel guest assistant. No I/O: the caller retrieves chunks/history
 * from Supabase and passes plain data in. Keeping this deterministic and
 * side-effect free makes it easy to unit-test the prompt contract (caps,
 * role mapping, locale instructions) without hitting OpenAI.
 */
const MAX_CHUNKS = 8;
const MAX_HISTORY = 10;

export interface RetrievedChunk {
  id: string;
  title: string;
  content: string;
}

export interface PromptCard {
  name: string;
  category: string;
  description: string | null;
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export function buildChatMessages(input: {
  locale: 'el' | 'en';
  hotelName: string;
  chunks: RetrievedChunk[];
  history: { role: 'guest' | 'assistant'; content: string }[];
  userMessage: string;
  cards?: PromptCard[];
}): ChatMessage[] {
  const chunks = input.chunks.slice(0, MAX_CHUNKS);
  const history = input.history.slice(-MAX_HISTORY);
  const languageName = input.locale === 'el' ? 'Greek' : 'English';

  const lines = [
    `You are the AI concierge for ${input.hotelName}, assisting hotel guests.`,
    `Answer ONLY using the facts provided below. If the facts don't cover the guest's question, say you don't know and suggest asking reception, in the guest's language.`,
    `Reply in ${languageName}.`,
    `Be concise and warm. Never invent businesses, prices, or opening hours that are not in the facts.`,
    `Write plain conversational text only: never use markdown of any kind — no asterisks, underscores, bullet points, numbered lists, or headings.`,
  ];

  if (input.cards && input.cards.length > 0) {
    const names = input.cards.map((c) => c.name).join(', ');
    lines.push(`Recommended places to mention by name in your reply: ${names}.`);
    lines.push(
      `The app already displays a card for each recommended place below your message — do NOT enumerate or describe them all. Reply in one or two short sentences that answer the guest's actual question, naming only the one or two places that best match it.`,
    );
  }

  lines.push('FACTS:');
  for (const chunk of chunks) {
    lines.push(`### ${chunk.title}`);
    lines.push(chunk.content);
  }

  const messages: ChatMessage[] = [{ role: 'system', content: lines.join('\n') }];

  for (const turn of history) {
    messages.push({ role: turn.role === 'guest' ? 'user' : 'assistant', content: turn.content });
  }

  messages.push({ role: 'user', content: input.userMessage });

  return messages;
}

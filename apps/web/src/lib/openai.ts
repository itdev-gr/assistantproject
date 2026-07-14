import OpenAI from 'openai';

let cached: OpenAI | null = null;

/** Server-only OpenAI client. Throws if OPENAI_API_KEY is unset. */
export function getOpenAI(): OpenAI {
  if (!cached) {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error('Missing env var: OPENAI_API_KEY');
    cached = new OpenAI({ apiKey: key });
  }
  return cached;
}

export function embeddingModel(): string {
  return process.env.OPENAI_EMBEDDING_MODEL ?? 'text-embedding-3-small';
}

export function chatModel(): string {
  return process.env.OPENAI_MODEL ?? 'gpt-4o-mini';
}

const EMBEDDING_BATCH_SIZE = 64;

/** Embeds a batch of texts, preserving input order. Batches requests at <=64 inputs each. */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  const client = getOpenAI();
  const model = embeddingModel();
  const vectors: number[][] = [];

  for (let i = 0; i < texts.length; i += EMBEDDING_BATCH_SIZE) {
    const batch = texts.slice(i, i + EMBEDDING_BATCH_SIZE);
    const response = await client.embeddings.create({ input: batch, model });
    const ordered = [...response.data].sort((a, b) => a.index - b.index);
    for (const item of ordered) vectors.push(item.embedding);
  }

  return vectors;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function completeChat(
  messages: ChatMessage[],
  opts?: { maxTokens?: number },
): Promise<string> {
  const client = getOpenAI();
  const response = await client.chat.completions.create({
    model: chatModel(),
    messages,
    max_tokens: opts?.maxTokens ?? 500,
  });
  return response.choices[0]?.message.content ?? '';
}

import OpenAI from 'openai';

let cached: OpenAI | null = null;

/**
 * Guest-facing budget for a single OpenAI call. The SDK defaults to a 10-minute
 * timeout with 2 retries, so a stalled call could hold a guest for half an hour
 * before `OpenAiProvider` degrades to the rule-based reply.
 *
 * Sized above the observed distribution on purpose: the slowest real reply
 * measured in production took 7.5s end to end. A tighter ceiling would not make
 * anything faster — it would swap the slow tail of *correct* answers for canned
 * templates. This only exists to bound the pathological case.
 */
const REQUEST_TIMEOUT_MS = 15_000;

/** Server-only OpenAI client. Throws if OPENAI_API_KEY is unset. */
export function getOpenAI(): OpenAI {
  if (!cached) {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error('Missing env var: OPENAI_API_KEY');
    cached = new OpenAI({ apiKey: key, timeout: REQUEST_TIMEOUT_MS, maxRetries: 1 });
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

/**
 * Low by design: the concierge is told to answer only from the retrieved
 * facts, so sampling creativity buys nothing and costs grounding. Left
 * overridable for experiments.
 */
const DEFAULT_TEMPERATURE = 0.3;

export async function completeChat(
  messages: ChatMessage[],
  opts?: { maxTokens?: number; temperature?: number },
): Promise<string> {
  const client = getOpenAI();
  const response = await client.chat.completions.create({
    model: chatModel(),
    messages,
    max_tokens: opts?.maxTokens ?? 500,
    temperature: opts?.temperature ?? DEFAULT_TEMPERATURE,
  });
  return response.choices[0]?.message.content ?? '';
}

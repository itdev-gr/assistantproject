import type { ChatRequest, ChatResponse } from '@aga/api-contracts';

export async function sendChat(
  origin: string,
  body: ChatRequest,
): Promise<ChatResponse> {
  const res = await fetch(origin + '/api/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('chat failed');
  return (await res.json()) as ChatResponse;
}

import { describe, expect, it } from 'vitest';
import { buildChatMessages } from './build-prompt';

const chunk = (n: number) => ({ id: `c${n}`, title: `Chunk ${n}`, content: `Content ${n}` });
const historyMsg = (n: number) => ({
  role: (n % 2 === 0 ? 'guest' : 'assistant') as 'guest' | 'assistant',
  content: `Message ${n}`,
});

describe('buildChatMessages', () => {
  it('uses only the first 8 chunks in the facts block', () => {
    const chunks = Array.from({ length: 9 }, (_, i) => chunk(i + 1));
    const messages = buildChatMessages({
      locale: 'en',
      hotelName: 'Aegean Blue',
      chunks,
      history: [],
      userMessage: 'What time is breakfast?',
    });
    const system = messages.find((m) => m.role === 'system')!;
    expect(system.content).toContain('Chunk 1');
    expect(system.content).toContain('Chunk 8');
    expect(system.content).not.toContain('Chunk 9');
  });

  it('uses only the last 10 history messages', () => {
    const history = Array.from({ length: 11 }, (_, i) => historyMsg(i + 1));
    const messages = buildChatMessages({
      locale: 'en',
      hotelName: 'Aegean Blue',
      chunks: [],
      history,
      userMessage: 'Anything else?',
    });
    const contents = messages.map((m) => m.content);
    expect(contents).not.toContain('Message 1');
    expect(contents).toContain('Message 2');
    expect(contents).toContain('Message 11');
  });

  it('maps guest history to user role and assistant history to assistant role', () => {
    const messages = buildChatMessages({
      locale: 'en',
      hotelName: 'Aegean Blue',
      chunks: [],
      history: [
        { role: 'guest', content: 'Hi there' },
        { role: 'assistant', content: 'Hello, how can I help?' },
      ],
      userMessage: 'What time is checkout?',
    });
    expect(messages[1]).toEqual({ role: 'user', content: 'Hi there' });
    expect(messages[2]).toEqual({ role: 'assistant', content: 'Hello, how can I help?' });
  });

  it('places the final user message last', () => {
    const messages = buildChatMessages({
      locale: 'en',
      hotelName: 'Aegean Blue',
      chunks: [],
      history: [{ role: 'guest', content: 'Hi' }],
      userMessage: 'What time is checkout?',
    });
    const last = messages[messages.length - 1];
    expect(last).toEqual({ role: 'user', content: 'What time is checkout?' });
  });

  it('includes the hotel name and facts in the system message', () => {
    const messages = buildChatMessages({
      locale: 'en',
      hotelName: 'Aegean Blue',
      chunks: [chunk(1)],
      history: [],
      userMessage: 'What time is checkout?',
    });
    const system = messages[0]!;
    expect(system.role).toBe('system');
    expect(system.content).toContain('Aegean Blue');
    expect(system.content).toContain('FACTS:');
    expect(system.content).toContain('### Chunk 1');
    expect(system.content).toContain('Content 1');
  });

  it('instructs the assistant to reply in Greek when locale is el', () => {
    const messages = buildChatMessages({
      locale: 'el',
      hotelName: 'Aegean Blue',
      chunks: [],
      history: [],
      userMessage: 'Πότε είναι το πρωινό;',
    });
    expect(messages[0]!.content).toContain('Greek');
    expect(messages[0]!.content).not.toContain('English');
  });

  it('instructs the assistant to reply in English when locale is en', () => {
    const messages = buildChatMessages({
      locale: 'en',
      hotelName: 'Aegean Blue',
      chunks: [],
      history: [],
      userMessage: 'When is breakfast?',
    });
    expect(messages[0]!.content).toContain('English');
    expect(messages[0]!.content).not.toContain('reply in Greek');
  });

  it('mentions recommendation card names in the system message when cards are provided', () => {
    const messages = buildChatMessages({
      locale: 'en',
      hotelName: 'Aegean Blue',
      chunks: [],
      history: [],
      userMessage: 'Where can I get a massage?',
      cards: [
        { name: 'Blue Lagoon Spa', category: 'spa', description: 'Relaxing sea-view spa' },
        { name: 'Sunset Wellness', category: 'spa', description: null },
      ],
    });
    expect(messages[0]!.content).toContain('Blue Lagoon Spa');
    expect(messages[0]!.content).toContain('Sunset Wellness');
  });

  it('omits the recommendations section when no cards are provided', () => {
    const messages = buildChatMessages({
      locale: 'en',
      hotelName: 'Aegean Blue',
      chunks: [],
      history: [],
      userMessage: 'What time is checkout?',
    });
    expect(messages[0]!.content).not.toContain('Recommended places');
  });

  it('always instructs plain text with no markdown, regardless of cards', () => {
    const withoutCards = buildChatMessages({
      locale: 'en',
      hotelName: 'Aegean Blue',
      chunks: [],
      history: [],
      userMessage: 'What time is checkout?',
    });
    const withCards = buildChatMessages({
      locale: 'en',
      hotelName: 'Aegean Blue',
      chunks: [],
      history: [],
      userMessage: 'Where can I get a massage?',
      cards: [{ name: 'Blue Lagoon Spa', category: 'spa', description: null }],
    });
    expect(withoutCards[0]!.content).toContain('never use markdown');
    expect(withCards[0]!.content).toContain('never use markdown');
  });

  it('instructs the assistant not to enumerate cards only when cards are provided', () => {
    const withoutCards = buildChatMessages({
      locale: 'en',
      hotelName: 'Aegean Blue',
      chunks: [],
      history: [],
      userMessage: 'What time is checkout?',
    });
    expect(withoutCards[0]!.content).not.toContain('do NOT enumerate');

    const withCards = buildChatMessages({
      locale: 'en',
      hotelName: 'Aegean Blue',
      chunks: [],
      history: [],
      userMessage: 'Where can I get a massage?',
      cards: [
        { name: 'Blue Lagoon Spa', category: 'spa', description: 'Relaxing sea-view spa' },
        { name: 'Sunset Wellness', category: 'spa', description: null },
      ],
    });
    expect(withCards[0]!.content).toContain('do NOT enumerate');
    expect(withCards[0]!.content).toContain('naming only the one or two places');
  });
});

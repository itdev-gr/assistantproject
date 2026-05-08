import type {
  ChatMessage,
  ChatRequest,
  ChatResponse,
  Locale,
  RecommendationCard,
} from '@aga/api-contracts';

export type { ChatMessage, ChatRequest, ChatResponse, Locale, RecommendationCard };

/**
 * The single seam where the response engine plugs in.
 *
 * MVP ships `RuleBasedProvider` (in @aga/response-engine). When the client
 * connects an external chatbot or LLM later, they implement another class
 * that satisfies this interface and inject it into the chat-turn handler —
 * no changes to the schema, UI, or revenue tracking.
 */
export interface ResponseProvider {
  respond(input: ResponseProviderInput): Promise<ResponseProviderOutput>;
}

export interface ResponseProviderInput {
  sessionId: string;
  hotelId: string;
  locale: Locale;
  message: string;
  history: ChatMessage[];
  /** Optional: lat/lng of the property for proximity ranking */
  hotelLocation?: { lat: number; lng: number };
  /** Optional: room context if the QR was room-scoped */
  roomId?: string;
  /** Local time at the hotel — used by ranking and "open now" flags */
  guestLocalTime: Date;
}

export interface ResponseProviderOutput {
  reply: string;
  intent: string;
  recommendations?: RecommendationCard[];
  needsStaff?: boolean;
  /** IDs of FAQs / amenities / partners used to compose the reply (for audit) */
  contextIds?: string[];
}

export type ChatStatus = 'idle' | 'sending' | 'error';

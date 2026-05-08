import type { Locale } from '@aga/api-contracts';
import { normalize, tokenize } from './normalize.js';

export type IntentSlug =
  | 'ask_checkin'
  | 'ask_checkout'
  | 'ask_wifi'
  | 'ask_breakfast'
  | 'ask_amenity_hours'
  | 'ask_policy'
  | 'ask_room_info'
  | 'recommend_restaurant'
  | 'recommend_bar'
  | 'recommend_activity'
  | 'recommend_taxi'
  | 'recommend_shop'
  | 'recommend_event'
  | 'staff_request'
  | 'smalltalk'
  | 'out_of_scope';

export interface IntentDefinition {
  slug: IntentSlug;
  /** Pre-normalized keywords. Diacritics already stripped. */
  keywordsEl: string[];
  keywordsEn: string[];
  /** Optional regex against normalized text */
  patterns?: RegExp[];
  /** Higher priority intents win on ties */
  priority?: number;
}

export interface IntentMatch {
  slug: IntentSlug;
  confidence: number;
  matchedTerms: string[];
}

/** Default seed taxonomy. In production these come from the `intents` DB table. */
export const DEFAULT_INTENTS: IntentDefinition[] = [
  {
    slug: 'ask_checkin',
    keywordsEl: ['τσεκ ιν', 'check in', 'αφιξη', 'ωρα αφιξης'],
    keywordsEn: ['check in', 'check-in', 'arrival', 'arrive', 'when can i arrive'],
    priority: 5,
  },
  {
    slug: 'ask_checkout',
    keywordsEl: ['τσεκ αουτ', 'check out', 'αναχωρηση', 'ωρα αναχωρησης'],
    keywordsEn: ['check out', 'check-out', 'departure', 'leave', 'when do i leave'],
    priority: 5,
  },
  {
    slug: 'ask_wifi',
    keywordsEl: ['wifi', 'ασυρματο', 'ιντερνετ', 'κωδικος', 'συνθηματικο'],
    keywordsEn: ['wifi', 'wi-fi', 'internet', 'password', 'network'],
    priority: 6,
  },
  {
    slug: 'ask_breakfast',
    keywordsEl: ['πρωινο', 'breakfast', 'ωρα πρωινου'],
    keywordsEn: ['breakfast', 'morning meal'],
    priority: 5,
  },
  {
    slug: 'ask_amenity_hours',
    keywordsEl: ['πισινα', 'σπα', 'γυμναστηριο', 'μπαρ ξενοδοχειου', 'ωρες λειτουργιας'],
    keywordsEn: ['pool', 'spa', 'gym', 'hotel bar', 'opening hours', 'when is open'],
    priority: 4,
  },
  {
    slug: 'ask_policy',
    keywordsEl: ['καπνισμα', 'κατοικιδια', 'σκυλο', 'ακυρωση', 'πληρωμη'],
    keywordsEn: ['smoking', 'pets', 'dog', 'cancellation', 'cancel', 'payment method'],
    priority: 4,
  },
  {
    slug: 'ask_room_info',
    keywordsEl: ['δωματιο', 'θεα', 'οροφος'],
    keywordsEn: ['room', 'view', 'floor'],
    priority: 3,
  },
  {
    slug: 'recommend_restaurant',
    keywordsEl: ['εστιατοριο', 'ταβερνα', 'φαγητο', 'γευμα', 'δειπνο'],
    keywordsEn: ['restaurant', 'tavern', 'food', 'eat', 'dinner', 'lunch', 'where to eat'],
    priority: 6,
  },
  {
    slug: 'recommend_bar',
    keywordsEl: ['μπαρ', 'καφε', 'ποτο', 'cocktail'],
    keywordsEn: ['bar', 'cafe', 'coffee', 'drink', 'cocktail', 'pub'],
    priority: 6,
  },
  {
    slug: 'recommend_activity',
    keywordsEl: [
      'εκδρομη',
      'βαρκα',
      'κρουαζιερα',
      'δραστηριοτητα',
      'περιηγηση',
      'αξιοθεατο',
      'τι να κανω',
    ],
    keywordsEn: [
      'tour',
      'excursion',
      'boat',
      'cruise',
      'activity',
      'sightseeing',
      'what to do',
      'things to do',
    ],
    priority: 6,
  },
  {
    slug: 'recommend_taxi',
    keywordsEl: ['ταξι', 'μεταφορα', 'αεροδρομιο'],
    keywordsEn: ['taxi', 'transfer', 'airport', 'ride'],
    priority: 6,
  },
  {
    slug: 'recommend_shop',
    keywordsEl: ['μαγαζι', 'καταστημα', 'σουπερ μαρκετ', 'ψωνια'],
    keywordsEn: ['shop', 'store', 'supermarket', 'shopping', 'buy'],
    priority: 6,
  },
  {
    slug: 'recommend_event',
    keywordsEl: ['εκδηλωση', 'γιορτη', 'φεστιβαλ', 'συναυλια'],
    keywordsEn: ['event', 'festival', 'concert', 'celebration', 'show'],
    priority: 6,
  },
  {
    slug: 'staff_request',
    keywordsEl: ['ρεσεψιον', 'υπαλληλος', 'βοηθεια', 'προβλημα'],
    keywordsEn: ['reception', 'staff', 'help', 'problem', 'speak to someone', 'human'],
    priority: 7,
  },
  {
    slug: 'smalltalk',
    keywordsEl: ['γεια', 'καλημερα', 'ευχαριστω'],
    keywordsEn: ['hi', 'hello', 'hey', 'thanks', 'thank you'],
    priority: 1,
  },
];

const MIN_CONFIDENCE = 0.4;

export function matchIntent(
  text: string,
  locale: Locale,
  intents: IntentDefinition[] = DEFAULT_INTENTS,
): IntentMatch {
  const norm = normalize(text);
  if (!norm) return { slug: 'out_of_scope', confidence: 0, matchedTerms: [] };

  const tokens = new Set(tokenize(text));
  const tokenCount = tokens.size || 1;

  let best: IntentMatch = { slug: 'out_of_scope', confidence: 0, matchedTerms: [] };

  for (const intent of intents) {
    const keywords = locale === 'el' ? intent.keywordsEl : intent.keywordsEn;
    const matched: string[] = [];
    let score = 0;

    for (const kw of keywords) {
      const nkw = normalize(kw);
      if (!nkw) continue;
      if (nkw.includes(' ')) {
        // multi-word phrase — score higher when fully present
        if (norm.includes(nkw)) {
          matched.push(kw);
          score += 1.5;
        }
      } else if (tokens.has(nkw)) {
        matched.push(kw);
        score += 1;
      }
    }

    if (intent.patterns) {
      for (const pat of intent.patterns) {
        if (pat.test(norm)) {
          matched.push(pat.source);
          score += 1;
        }
      }
    }

    if (matched.length === 0) continue;

    // Confidence: matched-keyword strength relative to user token count, with priority bias.
    const priorityBoost = (intent.priority ?? 1) / 10;
    const confidence = Math.min(1, score / Math.max(2, tokenCount) + priorityBoost);

    if (
      confidence > best.confidence ||
      (confidence === best.confidence && (intent.priority ?? 0) > getPriority(best.slug, intents))
    ) {
      best = { slug: intent.slug, confidence, matchedTerms: matched };
    }
  }

  if (best.confidence < MIN_CONFIDENCE) {
    return { slug: 'out_of_scope', confidence: best.confidence, matchedTerms: best.matchedTerms };
  }
  return best;
}

function getPriority(slug: IntentSlug, intents: IntentDefinition[]): number {
  return intents.find((i) => i.slug === slug)?.priority ?? 0;
}

export function isRecommendationIntent(slug: IntentSlug): boolean {
  return slug.startsWith('recommend_');
}

export function isAskIntent(slug: IntentSlug): boolean {
  return slug.startsWith('ask_');
}

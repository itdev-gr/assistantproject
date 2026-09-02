import type { Locale } from '@aga/api-contracts';
import type { IntentSlug } from './intent-matcher';

interface TemplateContext {
  /** Substitution values for {placeholders} in the template */
  values: Record<string, string | number | null | undefined>;
}

const TEMPLATES: Record<IntentSlug, Record<Locale, string>> = {
  ask_checkin: {
    el: 'Το check-in ξεκινά στις {time}.',
    en: 'Check-in starts at {time}.',
  },
  ask_checkout: {
    el: 'Το check-out είναι μέχρι τις {time}.',
    en: 'Check-out is by {time}.',
  },
  ask_wifi: {
    el: 'Το όνομα δικτύου είναι "{ssid}" και ο κωδικός είναι "{password}".',
    en: 'The network name is "{ssid}" and the password is "{password}".',
  },
  ask_breakfast: {
    el: 'Το πρωινό σερβίρεται από τις {opens} έως τις {closes}.',
    en: 'Breakfast is served from {opens} to {closes}.',
  },
  ask_amenity_hours: {
    el: '{name} — ώρες λειτουργίας: {opens}–{closes}.',
    en: '{name} — open {opens}–{closes}.',
  },
  ask_policy: {
    el: '{body}',
    en: '{body}',
  },
  ask_room_info: {
    el: 'Το δωμάτιο {code} βρίσκεται στον {floor}ο όροφο{viewSuffix}.',
    en: 'Room {code} is on floor {floor}{viewSuffix}.',
  },
  recommend_restaurant: {
    el: 'Ορίστε μερικές προτάσεις για φαγητό:',
    en: 'Here are some great spots to eat:',
  },
  recommend_bar: {
    el: 'Ορίστε μερικά αγαπημένα μπαρ και καφέ:',
    en: 'A few favourite bars and cafés:',
  },
  recommend_activity: {
    el: 'Ορίστε δραστηριότητες που ίσως σας αρέσουν:',
    en: 'Here are some activities you might enjoy:',
  },
  recommend_taxi: {
    el: 'Συνεργαζόμενοι μεταφορείς:',
    en: 'Trusted transfer partners:',
  },
  recommend_shop: {
    el: 'Καταστήματα κοντά σας:',
    en: 'Shops near you:',
  },
  recommend_event: {
    el: 'Επερχόμενες εκδηλώσεις:',
    en: 'Upcoming events:',
  },
  staff_request: {
    el: 'Ειδοποίησα την ομάδα — θα επικοινωνήσουν σύντομα.',
    en: "I've notified the team — they'll be in touch shortly.",
  },
  smalltalk: {
    el: 'Πώς μπορώ να βοηθήσω;',
    en: 'How can I help?',
  },
  out_of_scope: {
    el: 'Δεν έχω αυτή την πληροφορία. Η ρεσεψιόν μπορεί να βοηθήσει — θέλετε να τους ειδοποιήσω;',
    en: "I don't have that information. Reception can help — would you like me to notify them?",
  },
};

export function renderTemplate(intent: IntentSlug, locale: Locale, ctx: TemplateContext): string {
  const tpl = TEMPLATES[intent][locale];
  return tpl.replace(/\{(\w+)\}/g, (_, key: string) => {
    const v = ctx.values[key];
    return v == null ? '' : String(v);
  });
}

/** Intro used when a free-form question still matched a concrete place. */
export const PLACES_FOUND = {
  el: 'Ένα μέρος που ίσως σας βοηθήσει:',
  en: 'A place that might help:',
} as const;

/**
 * Turn the top cards into a short, human sentence fragment, e.g.
 * "Taverna Acropolis (0.4 km, open now) and Cafe Plateia (1.2 km)".
 */
export function describePlaces(
  places: Array<{ name: string; distanceKm: number | null; openNow: boolean | null }>,
  locale: Locale,
  max = 2,
): string {
  const parts = places.slice(0, max).map((p) => {
    const details: string[] = [];
    if (p.distanceKm != null) details.push(`${p.distanceKm} km`);
    if (p.openNow === true) details.push(locale === 'el' ? 'ανοιχτό τώρα' : 'open now');
    return details.length ? `${p.name} (${details.join(', ')})` : p.name;
  });
  if (parts.length <= 1) return parts.join('');
  const joiner = locale === 'el' ? ' και ' : ' and ';
  return parts.slice(0, -1).join(', ') + joiner + parts[parts.length - 1];
}

export const FALLBACK = {
  el: 'Δεν έχω αυτή την πληροφορία. Η ρεσεψιόν μπορεί να βοηθήσει — θέλετε να τους ειδοποιήσω;',
  en: "I don't have that information. Reception can help — would you like me to notify them?",
} as const;

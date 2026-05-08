import { describe, it, expect } from 'vitest';
import { matchIntent } from './intent-matcher.js';

describe('matchIntent — Greek', () => {
  it('classifies check-in question', () => {
    const m = matchIntent('Τι ώρα είναι το check in;', 'el');
    expect(m.slug).toBe('ask_checkin');
  });

  it('classifies wifi question with diacritics', () => {
    const m = matchIntent('Πού βρίσκω τον κωδικό για το ασύρματο;', 'el');
    expect(m.slug).toBe('ask_wifi');
  });

  it('classifies restaurant request', () => {
    const m = matchIntent('Πού να φάμε ψάρι κοντά;', 'el');
    expect(m.slug).toBe('recommend_restaurant');
  });

  it('classifies boat-trip request as activity', () => {
    const m = matchIntent('θέλω να κάνω μια κρουαζιέρα με βάρκα', 'el');
    expect(m.slug).toBe('recommend_activity');
  });

  it('classifies taxi request', () => {
    const m = matchIntent('μπορώ να πάρω ταξί για το αεροδρόμιο;', 'el');
    expect(m.slug).toBe('recommend_taxi');
  });

  it('classifies pet policy', () => {
    const m = matchIntent('Δέχεστε σκύλο στο δωμάτιο;', 'el');
    expect(m.slug).toBe('ask_policy');
  });

  it('falls back to out_of_scope for unknown', () => {
    const m = matchIntent('μου αρέσει το χρώμα μπλε', 'el');
    expect(m.slug).toBe('out_of_scope');
  });

  it('routes staff request', () => {
    const m = matchIntent('θέλω να μιλήσω με τη ρεσεψιόν', 'el');
    expect(m.slug).toBe('staff_request');
  });
});

describe('matchIntent — English', () => {
  it('classifies check-in', () => {
    expect(matchIntent('What time is check-in?', 'en').slug).toBe('ask_checkin');
  });

  it('classifies wifi', () => {
    expect(matchIntent('what is the wifi password', 'en').slug).toBe('ask_wifi');
  });

  it('classifies restaurant', () => {
    expect(matchIntent('where can I eat dinner tonight?', 'en').slug).toBe('recommend_restaurant');
  });

  it('classifies activity', () => {
    expect(matchIntent('any boat tours nearby?', 'en').slug).toBe('recommend_activity');
  });

  it('classifies smalltalk', () => {
    expect(matchIntent('thanks!', 'en').slug).toBe('smalltalk');
  });

  it('out_of_scope for unrelated', () => {
    expect(matchIntent('what is the meaning of life?', 'en').slug).toBe('out_of_scope');
  });
});

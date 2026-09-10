import { describe, expect, it } from 'vitest';
import {
  counterpartyOf,
  formatCommission,
  pickerState,
  requestErrorCode,
  statusTone,
} from './connections';

describe('pickerState', () => {
  it('is connected only while the partnership is active', () => {
    expect(pickerState({ active: true }, null, 'hotel')).toBe('connected');
    expect(
      pickerState({ active: false }, { initiated_by: 'hotel', status: 'accepted' }, 'hotel'),
    ).toBe('none');
  });

  it('distinguishes who sent the pending request', () => {
    const req = { initiated_by: 'hotel', status: 'pending' } as const;
    expect(pickerState(null, req, 'hotel')).toBe('pending_out');
    expect(pickerState(null, req, 'business')).toBe('pending_in');
  });

  it('ignores answered requests', () => {
    expect(pickerState(null, { initiated_by: 'business', status: 'declined' }, 'hotel')).toBe('none');
  });
});

describe('requestErrorCode', () => {
  it('passes through known codes', () => {
    expect(requestErrorCode('reverse_pending')).toBe('reverse_pending');
    expect(requestErrorCode('forbidden')).toBe('forbidden');
  });

  it('maps the unique-index race to already_pending', () => {
    expect(
      requestErrorCode('duplicate key value violates unique constraint "partnership_requests_one_pending"'),
    ).toBe('already_pending');
  });

  it('falls back to unknown', () => {
    expect(requestErrorCode('connection reset')).toBe('unknown');
    expect(requestErrorCode(null)).toBe('unknown');
  });
});

describe('misc helpers', () => {
  it('resolves the counterparty', () => {
    expect(counterpartyOf('hotel')).toBe('business');
    expect(counterpartyOf('business')).toBe('hotel');
  });

  it('maps statuses to pill tones', () => {
    expect(statusTone('pending')).toBe('warn');
    expect(statusTone('accepted')).toBe('ok');
    expect(statusTone('declined')).toBe('danger');
    expect(statusTone('cancelled')).toBe('muted');
  });

  it('formats commission per locale', () => {
    expect(formatCommission(12, 'en')).toBe('12% commission');
    expect(formatCommission(12.5, 'el')).toBe('12.5% προμήθεια');
    expect(formatCommission(null, 'en')).toBeNull();
    expect(formatCommission(0, 'en')).toBeNull();
  });
});

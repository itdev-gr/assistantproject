import { describe, it, expect } from 'vitest';
import { signReferral, verifyReferral } from './referral-token';

const SECRET = 'test-secret-32-bytes-long-aaaaaaaa';
const FUTURE = Math.floor(Date.now() / 1000) + 60 * 60;
const PAST = Math.floor(Date.now() / 1000) - 60;

describe('referral token', () => {
  it('round-trips and validates', () => {
    const token = signReferral('abc', FUTURE, SECRET);
    const parsed = verifyReferral(token, SECRET);
    expect(parsed?.referralId).toBe('abc');
  });

  it('rejects expired token', () => {
    const token = signReferral('abc', PAST, SECRET);
    expect(verifyReferral(token, SECRET)).toBeNull();
  });

  it('rejects tampered ID', () => {
    const token = signReferral('abc', FUTURE, SECRET);
    const parts = token.split('.');
    const tampered = `evil.${parts[1]}.${parts[2]}`;
    expect(verifyReferral(tampered, SECRET)).toBeNull();
  });

  it('rejects wrong secret', () => {
    const token = signReferral('abc', FUTURE, SECRET);
    expect(verifyReferral(token, 'other')).toBeNull();
  });

  it('rejects malformed token', () => {
    expect(verifyReferral('two.parts', SECRET)).toBeNull();
    expect(verifyReferral('', SECRET)).toBeNull();
  });
});

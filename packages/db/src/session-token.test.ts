import { describe, it, expect } from 'vitest';
import { signSessionToken, verifySessionToken } from './session-token.js';

const SECRET = 'test-secret-32-bytes-long-aaaaaaaa';

describe('session token', () => {
  it('round-trips a session id', () => {
    const token = signSessionToken('abc-123', SECRET);
    expect(verifySessionToken(token, SECRET)).toBe('abc-123');
  });

  it('rejects tampered token', () => {
    const token = signSessionToken('abc-123', SECRET);
    const tampered = `evil.${token.split('.')[1]}`;
    expect(verifySessionToken(tampered, SECRET)).toBeNull();
  });

  it('rejects wrong secret', () => {
    const token = signSessionToken('abc-123', SECRET);
    expect(verifySessionToken(token, 'other-secret')).toBeNull();
  });

  it('rejects malformed token', () => {
    expect(verifySessionToken('no-dot', SECRET)).toBeNull();
    expect(verifySessionToken('', SECRET)).toBeNull();
  });
});

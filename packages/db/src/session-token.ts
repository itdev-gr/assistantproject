import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Signed guest-session token. Format: `<sessionId>.<hmac>` where hmac is
 * `sha256(secret, sessionId)` base64url-encoded. The session id alone is
 * meaningless without the signature; this is the only auth a guest carries.
 */
export function signSessionToken(sessionId: string, secret: string): string {
  const sig = createHmac('sha256', secret).update(sessionId).digest('base64url');
  return `${sessionId}.${sig}`;
}

export function verifySessionToken(token: string, secret: string): string | null {
  const dot = token.lastIndexOf('.');
  if (dot < 1) return null;
  const sessionId = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = createHmac('sha256', secret).update(sessionId).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return null;
  return timingSafeEqual(a, b) ? sessionId : null;
}

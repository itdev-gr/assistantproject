import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Signed referral token. Format: `<referralId>.<expiresEpochSec>.<hmac>` where
 * hmac is `sha256(secret, "<referralId>.<expiresEpochSec>")` base64url-encoded.
 * The token is single-use only via DB checks (clicked_at), but the HMAC stops
 * anyone from forging arbitrary referral IDs.
 */
export function signReferral(
  referralId: string,
  expiresEpochSec: number,
  secret: string,
): string {
  const payload = `${referralId}.${expiresEpochSec}`;
  const sig = createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export interface ParsedReferral {
  referralId: string;
  expiresEpochSec: number;
}

export function verifyReferral(token: string, secret: string): ParsedReferral | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [referralId, expStr, sig] = parts;
  if (!referralId || !expStr || !sig) return null;
  const exp = Number.parseInt(expStr, 10);
  if (!Number.isFinite(exp)) return null;
  const expected = createHmac('sha256', secret).update(`${referralId}.${exp}`).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return null;
  if (!timingSafeEqual(a, b)) return null;
  if (exp < Math.floor(Date.now() / 1000)) return null;
  return { referralId, expiresEpochSec: exp };
}

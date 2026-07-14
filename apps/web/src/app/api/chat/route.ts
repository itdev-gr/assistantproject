import { NextResponse } from 'next/server';
import { chatRequestSchema, type ChatResponse } from '@aga/api-contracts';
import { RuleBasedProvider } from '@aga/response-engine';
import { detectLocale } from '@aga/i18n';
import { createSupabaseServiceClient } from '@aga/db/service';
import { signSessionToken, verifySessionToken } from '@aga/db/session-token';
import { buildDataPort } from '@/lib/response-data-port';
import { OpenAiProvider } from '@/lib/openai-provider';
import { checkAndRecordRateLimit, hashRateKey } from '@/lib/rate-limit';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = chatRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }
  const { hotelSlug, message, locale: hint, roomId } = parsed.data;
  const locale = hint ?? detectLocale(message);

  const supabase = createSupabaseServiceClient();

  const { data: hotelRow, error } = await supabase
    .from('public_hotels')
    .select('id, name, timezone, default_locale')
    .eq('slug', hotelSlug)
    .maybeSingle();
  if (error || !hotelRow || !hotelRow.id || !hotelRow.name || !hotelRow.timezone) {
    return NextResponse.json({ error: 'hotel_not_found' }, { status: 404 });
  }
  const hotel = hotelRow as { id: string; name: string; timezone: string; default_locale: string | null };

  const secret = requireEnv('SESSION_HMAC_SECRET');
  const cookie = req.headers.get('cookie') ?? '';
  const tokenName = `aga_session_${hotel.id.slice(0, 8)}`;
  const cookieToken = parseCookie(cookie, tokenName);
  let sessionId = cookieToken ? verifySessionToken(cookieToken, secret) : null;

  if (!sessionId) {
    const { data: created, error: sessionErr } = await supabase
      .from('guest_sessions')
      .insert({
        hotel_id: hotel.id,
        room_id: roomId ?? null,
        locale_detected: locale,
      })
      .select('id')
      .single();
    if (sessionErr || !created) {
      return NextResponse.json({ error: 'session_create_failed' }, { status: 500 });
    }
    sessionId = created.id;
  }

  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0]?.trim() || 'unknown';
  const { limited } = await checkAndRecordRateLimit(supabase, {
    session: hashRateKey('session', sessionId, secret),
    ip: hashRateKey('ip', ip, secret),
  });
  if (limited) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });

  // Persist guest message
  await supabase.from('messages').insert({
    session_id: sessionId,
    role: 'guest',
    content: message,
  });

  const appOrigin = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin;
  const dataPort = buildDataPort(supabase, { sessionId, appOrigin, hmacSecret: secret });
  const ruleProvider = new RuleBasedProvider(dataPort);
  const { data: flag } = await supabase
    .from('feature_flags')
    .select('enabled')
    .eq('flag', 'llm_chat')
    .or(`hotel_id.eq.${hotel.id},hotel_id.is.null`)
    .order('hotel_id', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();
  const provider =
    flag?.enabled && process.env.OPENAI_API_KEY
      ? new OpenAiProvider({ admin: supabase, data: dataPort, fallback: ruleProvider, hotelName: hotel.name })
      : ruleProvider;
  const result = await provider.respond({
    sessionId,
    hotelId: hotel.id,
    locale,
    message,
    history: [],
    guestLocalTime: nowInTimeZone(hotel.timezone),
    roomId,
  });

  // Persist assistant message
  await supabase.from('messages').insert({
    session_id: sessionId,
    role: 'assistant',
    content: result.reply,
    intent_slug: result.intent,
    needs_staff: result.needsStaff ?? false,
    retrieved_context_ids: result.contextIds ?? [],
  });

  const body: ChatResponse = {
    reply: result.reply,
    intent: result.intent,
    recommendations: result.recommendations,
    needsStaff: result.needsStaff,
    sessionId,
  };
  const res = NextResponse.json(body);
  if (!cookieToken) {
    const signed = signSessionToken(sessionId, secret);
    res.cookies.set(tokenName, signed, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });
  }
  return res;
}

function parseCookie(cookieHeader: string, name: string): string | null {
  const parts = cookieHeader.split(/;\s*/);
  for (const p of parts) {
    const eq = p.indexOf('=');
    if (eq < 0) continue;
    if (p.slice(0, eq) === name) return decodeURIComponent(p.slice(eq + 1));
  }
  return null;
}

function nowInTimeZone(tz: string): Date {
  // Approximation: JS Date is UTC-based. The ranking algorithm only needs the
  // hour-of-day and weekday for "open now" — this returns a Date whose UTC
  // fields equal the local clock in tz, which is what the consumers expect.
  const now = new Date();
  const local = new Date(now.toLocaleString('en-US', { timeZone: tz }));
  return local;
}

function requireEnv(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`Missing env var: ${key}`);
  return v;
}

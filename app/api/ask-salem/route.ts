// Ask Salem bridge — same-origin proxy to the Salem documentation assistant
// (https://salem.opencoven.ai/api/chat).
//
// Salem's CORS allowlists only https://docs.opencoven.ai, so the production
// widget talks to Salem directly from the browser and inherits Salem's own
// per-visitor-IP rate limit. This bridge exists for every other origin (local
// dev, preview deployments), where all proxied traffic shares one egress IP
// and one upstream quota — so it defends itself, cheapest checks first:
//
//    1. POST + application/json only
//    2. Ban list — IPs that keep tripping the guards below are refused
//       outright, with escalating ban lengths (lib/ask-salem-limiter)
//    3. Same-origin guard: Origin header must match this deployment
//    4. Bot fingerprint: real-browser Sec-Fetch-* headers, a non-tool
//       User-Agent, and the widget's own marker header are all required
//       (lib/ask-salem-guards); failures earn strikes toward a ban
//    5. Body cap (8 KB) and strict schema — a single `message` of 1..2000
//       chars, no unknown fields
//    6. Spam heuristics: control characters, link floods, and repeated-filler
//       payloads are refused and earn strikes
//    7. Single-turn only: history is never forwarded (Salem gates follow-up
//       history behind an admin password; this bridge never carries secrets)
//    8. Duplicate suppression: a question already answered for this IP inside
//       the window is refused without burning quota
//    9. Rate limits (lib/ask-salem-limiter): a per-IP burst floor, short
//       (3-minute) and hourly sliding windows per IP, and per-instance global
//       windows that bound total upstream spend even if per-IP keying is
//       evaded; hammering a full window earns strikes
//   10. Model + retrieval pinned server-side; client values ignored
//   11. No client header passthrough — X-Salem-Admin-Password in particular
//       is dropped, never proxied
//   12. Upstream concurrency cap and hard timeout so held-open streams cannot
//       pile up
//
// The client IP is read from platform-set headers (x-real-ip, else
// x-forwarded-for, which Vercel overwrites — client-supplied values never
// survive), so it cannot be spoofed by inbound header values on Vercel.
//
// Responses stream back as text/plain, mirroring Salem, with its diagnostic
// x-* headers forwarded.

import {
  checkBan,
  checkRateLimit,
  isDuplicateQuestion,
  recordAnsweredQuestion,
  recordViolation,
} from '@/lib/ask-salem-limiter';
import { botVerdict, spamVerdict } from '@/lib/ask-salem-guards';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UPSTREAM_URL =
  process.env.SALEM_UPSTREAM_URL ?? 'https://salem.opencoven.ai/api/chat';
const MESSAGE_MAX_CHARS = 2_000; // matches Salem's own input cap
const BODY_MAX_BYTES = 8_192;
const UPSTREAM_TIMEOUT_MS = 60_000;
const MAX_CONCURRENT_UPSTREAM = 2;
const PINNED_MODEL = 'gpt-5.2';
const PINNED_RETRIEVAL = 'auto';
const KNOWN_BODY_KEYS = new Set(['message', 'history', 'model', 'retrieval']);

const FORWARDED_RESPONSE_HEADERS =
  /^(x-ratelimit-|x-query-id|x-best-score|x-threshold|x-low-confidence|x-result-count|x-strategy|x-intent|retry-after)/i;

let inFlight = 0;

function jsonError(
  message: string,
  status: number,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify({ error: message, status }), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...headers,
    },
  });
}

function bannedResponse(retryAfterSec: number): Response {
  return jsonError(
    'This address is temporarily blocked after repeated abuse of the docs assistant.',
    429,
    { 'retry-after': String(retryAfterSec) },
  );
}

function clientIp(req: Request): string {
  // Trust only platform-set values. Vercel sets x-real-ip to the client IP
  // and overwrites inbound x-forwarded-for entirely (client-supplied values
  // are discarded), with the client IP first — so the first entry is safe on
  // this platform. In local dev neither header exists — everyone is "local".
  const realIp = req.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;
  const xff = req.headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }
  return 'local';
}

/** Browser-only endpoint: the Origin header must match this deployment. */
function sameOriginGuard(req: Request): Response | null {
  const origin = req.headers.get('origin');
  if (!origin) {
    return jsonError(
      'Missing Origin header. This endpoint only serves the docs-site widget.',
      403,
    );
  }
  let selfOrigin: string;
  try {
    selfOrigin = new URL(req.url).origin;
  } catch {
    return jsonError('Unable to resolve request origin.', 403);
  }
  if (origin !== selfOrigin) {
    return jsonError('Cross-origin requests are not allowed.', 403);
  }
  return null;
}

async function readBody(req: Request): Promise<{ message: string } | Response> {
  const contentType = req.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().includes('application/json')) {
    return jsonError('Content-Type must be application/json.', 415);
  }

  let raw: ArrayBuffer;
  try {
    raw = await req.arrayBuffer();
  } catch {
    return jsonError('Unable to read request body.', 400);
  }
  if (raw.byteLength === 0) return jsonError('Request body is required.', 400);
  if (raw.byteLength > BODY_MAX_BYTES) {
    return jsonError(`Request body exceeds ${BODY_MAX_BYTES} bytes.`, 413);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder().decode(raw));
  } catch {
    return jsonError('Request body must be valid JSON.', 400);
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return jsonError('Request body must be a JSON object.', 400);
  }

  for (const key of Object.keys(parsed)) {
    if (!KNOWN_BODY_KEYS.has(key)) {
      return jsonError(`Unexpected field "${key}" in request body.`, 400);
    }
  }

  const { message, history } = parsed as {
    message?: unknown;
    history?: unknown;
  };
  if (typeof message !== 'string' || message.trim().length === 0) {
    return jsonError('"message" must be a non-empty string.', 400);
  }
  if (message.length > MESSAGE_MAX_CHARS) {
    return jsonError(
      `"message" exceeds the ${MESSAGE_MAX_CHARS}-character limit.`,
      400,
    );
  }
  if (Array.isArray(history) && history.length > 0) {
    return jsonError(
      'Follow-up history is not supported here. Ask each question standalone, or use salem.opencoven.ai directly.',
      400,
    );
  }

  return { message: message.trim() };
}

export async function POST(req: Request): Promise<Response> {
  const ip = clientIp(req);

  const ban = checkBan(ip);
  if (ban.banned) return bannedResponse(ban.retryAfterSec);

  const originError = sameOriginGuard(req);
  if (originError) return originError;

  const bot = botVerdict(req.headers);
  if (!bot.ok) {
    const after = recordViolation(ip);
    if (after.banned) return bannedResponse(after.retryAfterSec);
    return jsonError(bot.reason, 403);
  }

  const body = await readBody(req);
  if (body instanceof Response) return body;

  const spam = spamVerdict(body.message);
  if (!spam.ok) {
    const after = recordViolation(ip);
    if (after.banned) return bannedResponse(after.retryAfterSec);
    return jsonError(spam.reason, 400);
  }

  const dup = isDuplicateQuestion(ip, body.message);
  if (dup.duplicate) {
    return jsonError(
      'You just asked this — the previous answer still stands. Rephrase the question to ask again sooner.',
      409,
      { 'retry-after': String(dup.retryAfterSec) },
    );
  }

  const decision = checkRateLimit(ip);
  if (!decision.ok) {
    // checkRateLimit records strikes for hammered windows; a strike may have
    // just crossed the ban threshold.
    const banNow = checkBan(ip);
    if (banNow.banned) return bannedResponse(banNow.retryAfterSec);
    return jsonError(
      decision.reason === 'burst'
        ? 'Sending too fast — wait a moment between questions.'
        : 'Rate limit reached. Salem answers a few questions per visitor every few minutes — please retry shortly.',
      429,
      {
        'retry-after': String(decision.retryAfterSec),
        'x-ratelimit-limit': String(decision.limit),
        'x-ratelimit-remaining': '0',
      },
    );
  }

  if (inFlight >= MAX_CONCURRENT_UPSTREAM) {
    return jsonError(
      'Salem is answering other questions right now. Please retry in a few seconds.',
      503,
      { 'retry-after': '5' },
    );
  }

  inFlight += 1;
  const abort = new AbortController();
  const timeout = setTimeout(() => abort.abort(), UPSTREAM_TIMEOUT_MS);
  let upstream: globalThis.Response;
  try {
    // Fresh body, pinned parameters, no client headers — nothing from the
    // inbound request reaches Salem except the question text.
    upstream = await fetch(UPSTREAM_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        message: body.message,
        history: [],
        model: PINNED_MODEL,
        retrieval: PINNED_RETRIEVAL,
      }),
      signal: abort.signal,
    });
  } catch {
    clearTimeout(timeout);
    inFlight -= 1;
    const timedOut = abort.signal.aborted;
    return jsonError(
      timedOut
        ? 'Salem took too long to answer. Please try again.'
        : 'Salem is unreachable right now. Please try again later.',
      timedOut ? 504 : 502,
    );
  }

  // Only remember questions Salem actually answered, so a visitor retrying
  // after an upstream failure is not misread as a spammer replaying.
  if (upstream.ok) recordAnsweredQuestion(ip, body.message);

  const headers = new Headers({
    'content-type':
      upstream.headers.get('content-type') ?? 'text/plain; charset=utf-8',
    'cache-control': 'no-store',
    'x-ratelimit-bridge-remaining': String(decision.remaining),
  });
  for (const [key, value] of upstream.headers) {
    if (FORWARDED_RESPONSE_HEADERS.test(key)) headers.set(key, value);
  }

  const release = () => {
    clearTimeout(timeout);
    inFlight = Math.max(0, inFlight - 1);
  };

  if (!upstream.body) {
    release();
    return new Response(null, { status: upstream.status, headers });
  }

  // Pipe the stream through, releasing the concurrency slot (and the abort
  // timer) when the stream settles either way.
  const reader = upstream.body.getReader();
  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { done, value } = await reader.read();
        if (done) {
          release();
          controller.close();
          return;
        }
        controller.enqueue(value);
      } catch (err) {
        release();
        controller.error(err);
      }
    },
    cancel(reason) {
      release();
      return reader.cancel(reason);
    },
  });

  return new Response(stream, { status: upstream.status, headers });
}

// Stateless request guards for the /api/ask-salem bridge: bot fingerprinting
// and spam-content heuristics. Stateful controls (rate limits, bans, duplicate
// suppression) live in lib/ask-salem-limiter.ts.
//
// None of these checks is unbeatable on its own — a determined attacker can
// forge any header. Their job is to stop the cheap, common abuse (curl loops,
// script kiddies replaying the payload, generic scrapers) and to feed the
// limiter's strike system so anything that keeps probing gets banned.

export type Verdict = { ok: true } | { ok: false; reason: string };

/** The widget sends this on every bridge request; its absence marks a bot. */
export const CLIENT_MARKER_HEADER = 'x-ask-salem-client';
export const CLIENT_MARKER_VALUE = 'docs-widget/1';

const BOT_UA_PATTERN =
  /curl|wget|python|httpx|aiohttp|okhttp|libwww|scrapy|go-http|node-fetch|undici|axios|java(?!script)|perl|ruby|php|bot\b|spider|crawl|scan|headless|phantom|puppeteer|playwright|selenium/i;

/**
 * Reject requests that do not look like they came from a real browser running
 * the docs widget:
 *
 * - `User-Agent` must be present and not match known tool/bot signatures.
 * - `Sec-Fetch-Site` / `Sec-Fetch-Mode` are forbidden headers that every
 *   modern browser attaches automatically and CLI tools do not. A same-origin
 *   widget fetch is always `same-origin` + `cors`.
 * - The widget's own marker header must be present with the expected value.
 */
export function botVerdict(headers: Headers): Verdict {
  const ua = headers.get('user-agent')?.trim() ?? '';
  if (ua.length === 0) {
    return { ok: false, reason: 'Requests without a User-Agent are not served.' };
  }
  if (BOT_UA_PATTERN.test(ua)) {
    return { ok: false, reason: 'Automated clients are not served by this endpoint.' };
  }

  const site = headers.get('sec-fetch-site');
  if (site === null) {
    return { ok: false, reason: 'This endpoint only serves browser requests.' };
  }
  if (site.toLowerCase() !== 'same-origin') {
    return { ok: false, reason: 'Only same-origin browser requests are served.' };
  }

  const mode = headers.get('sec-fetch-mode')?.toLowerCase();
  if (mode !== 'cors' && mode !== 'same-origin') {
    return { ok: false, reason: 'Only same-origin browser requests are served.' };
  }

  const dest = headers.get('sec-fetch-dest')?.toLowerCase();
  if (dest !== undefined && dest !== null && dest !== 'empty') {
    return { ok: false, reason: 'Only same-origin browser requests are served.' };
  }

  if (headers.get(CLIENT_MARKER_HEADER) !== CLIENT_MARKER_VALUE) {
    return { ok: false, reason: 'This endpoint only serves the docs-site widget.' };
  }

  return { ok: true };
}

const URL_PATTERN = /https?:\/\//gi;
// Allow \n, \r, \t; reject every other C0/C1 control character.
const CONTROL_CHARS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/;

/**
 * Cheap content heuristics that catch low-effort spam floods without
 * misfiring on real documentation questions (which may legitimately contain
 * code, error output, and a link or two).
 */
export function spamVerdict(message: string): Verdict {
  if (CONTROL_CHARS.test(message)) {
    return { ok: false, reason: 'Question contains control characters.' };
  }

  const urls = message.match(URL_PATTERN);
  if (urls !== null && urls.length > 3) {
    return { ok: false, reason: 'Too many links for a documentation question.' };
  }

  // A single character repeated at length ("aaaa…", "!!!!…").
  if (/(.)\1{29}/s.test(message)) {
    return { ok: false, reason: 'Question looks like repeated filler.' };
  }

  // Long input drawn from a tiny alphabet (keyboard mashing, padding floods).
  if (message.length >= 40) {
    const unique = new Set(message.replace(/\s/g, ''));
    if (unique.size <= 4) {
      return { ok: false, reason: 'Question looks like repeated filler.' };
    }
  }

  // The same word over and over ("spam spam spam …").
  const tokens = message.split(/\s+/).filter(Boolean);
  if (tokens.length >= 8) {
    const uniqueTokens = new Set(tokens.map((t) => t.toLowerCase()));
    if (uniqueTokens.size <= 2) {
      return { ok: false, reason: 'Question looks like repeated filler.' };
    }
  }

  return { ok: true };
}

// Rate limiting, abuse escalation, and duplicate suppression for the
// /api/ask-salem bridge.
//
// Why the bridge needs its own limiter: Salem enforces a per-IP quota keyed on
// the *connection* IP (it ignores X-Forwarded-For, so the quota cannot be
// spoofed away — verified 2026-07-21). Every request proxied through this docs
// deployment therefore shares ONE upstream bucket (the deployment's egress
// IP). Without a local gate, a single visitor could drain that shared bucket
// and lock out everyone else — or hammer Salem itself.
//
// Controls, layered strictest-first:
//
//   - Ban list: IPs that keep tripping guards (bot fingerprint failures, spam
//     payloads, rate-limit hammering) collect strikes; enough strikes inside
//     the strike window bans the IP, and repeat bans double in length.
//   - Burst gate: a minimum interval between accepted requests per IP. The
//     widget already enforces a 3 s client-side floor, so only automation
//     trips this.
//   - Sliding windows: a short window for burst fairness and an hourly window
//     to cap sustained use, both per-IP and per-instance. The global caps
//     bound total upstream spend even when per-IP keying is evaded by
//     spoofing (possible in local dev only — on Vercel the IP comes from
//     platform-set headers).
//   - Duplicate suppression: the same normalized question from the same IP is
//     answered once per window; replays are rejected without burning quota.
//
// The store is in-memory and per-instance. That is acceptable here: the
// production site (docs.opencoven.ai) sends widget traffic browser→Salem
// directly (Salem's CORS allowlists that origin), so the bridge only serves
// local dev and preview deployments, where traffic is a trickle and instances
// are few. The limits below deliberately sum to less than Salem's upstream
// quota so even N cold instances rarely overrun it.

export interface LimitDecision {
  ok: boolean;
  /** seconds until the caller may retry (0 when ok) */
  retryAfterSec: number;
  /** requests remaining in the short per-IP window (after this hit) */
  remaining: number;
  /** the limit that was binding for this decision */
  limit: number;
  reason?: 'burst' | 'ip-window' | 'ip-hourly' | 'global' | 'global-hourly';
}

const WINDOW_MS = 180_000; // 3 minutes — matches Salem's observed window
const HOUR_MS = 3_600_000;
export const PER_IP_LIMIT = 3; // per visitor per short window
export const GLOBAL_LIMIT = 8; // whole instance per short window; Salem allows 10
export const PER_IP_HOURLY_LIMIT = 12; // sustained per-visitor ceiling
export const GLOBAL_HOURLY_LIMIT = 48; // sustained per-instance ceiling
export const MIN_INTERVAL_MS = 2_000; // server-side burst floor (widget uses 3 s)

export const STRIKES_TO_BAN = 5;
const STRIKE_WINDOW_MS = 600_000; // strikes older than 10 minutes expire
const BAN_BASE_MS = 900_000; // first ban: 15 minutes …
const BAN_MAX_MS = 7_200_000; // … doubling per repeat ban, capped at 2 hours

export const DUPLICATE_WINDOW_MS = 300_000; // identical question suppressed 5 min
const MAX_RECENT_QUESTIONS_PER_IP = 8;
const MAX_TRACKED_IPS = 2_000;

interface IpState {
  /** ms timestamps of accepted requests in the short window, oldest first */
  hits: number[];
  /** ms timestamps of accepted requests in the hourly window, oldest first */
  hourHits: number[];
  /** ms timestamp of the most recently accepted request */
  lastAccepted: number;
  /** ms timestamps of guard violations, oldest first */
  strikes: number[];
  /** ms timestamp the current ban expires (0 = not banned) */
  banUntil: number;
  /** lifetime ban count for this entry, drives escalation */
  banCount: number;
  /** normalized-question hash → ms timestamp it was answered */
  recentQuestions: Map<string, number>;
}

const perIp = new Map<string, IpState>();
const globalHits: number[] = [];
const globalHourHits: number[] = [];

function freshState(): IpState {
  return {
    hits: [],
    hourHits: [],
    lastAccepted: 0,
    strikes: [],
    banUntil: 0,
    banCount: 0,
    recentQuestions: new Map(),
  };
}

function pruneList(list: number[], cutoff: number): void {
  while (list.length > 0 && list[0] <= cutoff) list.shift();
}

function retryAfterFrom(list: number[], windowMs: number, now: number): number {
  if (list.length === 0) return 1;
  return Math.max(1, Math.ceil((list[0] + windowMs - now) / 1000));
}

function pruneState(state: IpState, now: number): void {
  pruneList(state.hits, now - WINDOW_MS);
  pruneList(state.hourHits, now - HOUR_MS);
  pruneList(state.strikes, now - STRIKE_WINDOW_MS);
  for (const [hash, ts] of state.recentQuestions) {
    if (ts <= now - DUPLICATE_WINDOW_MS) state.recentQuestions.delete(hash);
  }
}

function isDeadState(state: IpState, now: number): boolean {
  return (
    state.hits.length === 0 &&
    state.hourHits.length === 0 &&
    state.strikes.length === 0 &&
    state.banUntil <= now &&
    state.recentQuestions.size === 0
  );
}

/** Sweep dead entries so the map cannot grow without bound. */
function sweep(now: number): void {
  for (const [key, state] of perIp) {
    pruneState(state, now);
    if (isDeadState(state, now)) perIp.delete(key);
  }
  // Still oversized after pruning (an actual flood of distinct IPs): drop the
  // oldest-inserted entries. Map preserves insertion order.
  if (perIp.size > MAX_TRACKED_IPS) {
    const excess = perIp.size - MAX_TRACKED_IPS;
    let dropped = 0;
    for (const key of perIp.keys()) {
      perIp.delete(key);
      if (++dropped >= excess) break;
    }
  }
}

function getState(ip: string, now: number): IpState {
  const state = perIp.get(ip) ?? freshState();
  pruneState(state, now);
  perIp.set(ip, state);
  return state;
}

/** Is this IP currently banned? Cheap; call before any other work. */
export function checkBan(
  ip: string,
  now = Date.now(),
): { banned: boolean; retryAfterSec: number } {
  const state = perIp.get(ip);
  if (!state || state.banUntil <= now) return { banned: false, retryAfterSec: 0 };
  return {
    banned: true,
    retryAfterSec: Math.max(1, Math.ceil((state.banUntil - now) / 1000)),
  };
}

/**
 * Record a guard violation (bot fingerprint failure, spam payload,
 * rate-limit hammering) against `ip`. Enough strikes inside the strike
 * window starts a ban; each repeat ban doubles in length up to the cap.
 */
export function recordViolation(
  ip: string,
  now = Date.now(),
): { banned: boolean; retryAfterSec: number } {
  sweep(now);
  const state = getState(ip, now);
  state.strikes.push(now);
  if (state.strikes.length >= STRIKES_TO_BAN && state.banUntil <= now) {
    const duration = Math.min(
      BAN_BASE_MS * 2 ** Math.min(state.banCount, 10),
      BAN_MAX_MS,
    );
    state.banUntil = now + duration;
    state.banCount += 1;
    state.strikes = [];
  }
  return checkBan(ip, now);
}

function normalizeQuestion(message: string): string {
  return message.toLowerCase().replace(/\s+/g, ' ').trim();
}

/** djb2 — collisions only mean a rare false "duplicate" for one IP. */
function hashQuestion(message: string): string {
  const normalized = normalizeQuestion(message);
  let hash = 5381;
  for (let i = 0; i < normalized.length; i++) {
    hash = ((hash << 5) + hash + normalized.charCodeAt(i)) | 0;
  }
  return `${hash}:${normalized.length}`;
}

/** Has this IP already had this exact question answered inside the window? */
export function isDuplicateQuestion(
  ip: string,
  message: string,
  now = Date.now(),
): { duplicate: boolean; retryAfterSec: number } {
  const state = perIp.get(ip);
  if (!state) return { duplicate: false, retryAfterSec: 0 };
  const answeredAt = state.recentQuestions.get(hashQuestion(message));
  if (answeredAt === undefined || answeredAt <= now - DUPLICATE_WINDOW_MS) {
    return { duplicate: false, retryAfterSec: 0 };
  }
  return {
    duplicate: true,
    retryAfterSec: Math.max(
      1,
      Math.ceil((answeredAt + DUPLICATE_WINDOW_MS - now) / 1000),
    ),
  };
}

/** Remember an answered question so replays inside the window are refused. */
export function recordAnsweredQuestion(
  ip: string,
  message: string,
  now = Date.now(),
): void {
  const state = getState(ip, now);
  state.recentQuestions.set(hashQuestion(message), now);
  if (state.recentQuestions.size > MAX_RECENT_QUESTIONS_PER_IP) {
    for (const key of state.recentQuestions.keys()) {
      state.recentQuestions.delete(key);
      if (state.recentQuestions.size <= MAX_RECENT_QUESTIONS_PER_IP) break;
    }
  }
}

/**
 * Record-and-check a request from `ip`. Consumes quota only when allowed, so
 * requests rejected *by this limiter* do not extend the caller's lockout.
 * (Rejections elsewhere in the route — e.g. the concurrency cap — happen after
 * quota is consumed and are outside this function's control.)
 *
 * Rejections for a full short window count as strikes: well-behaved clients
 * honor Retry-After (the widget disables sending during its cooldown), so an
 * IP that keeps arriving while limited is automation and works toward a ban.
 */
export function checkRateLimit(ip: string, now = Date.now()): LimitDecision {
  sweep(now);
  pruneList(globalHits, now - WINDOW_MS);
  pruneList(globalHourHits, now - HOUR_MS);

  const state = getState(ip, now);

  if (state.lastAccepted > 0 && now - state.lastAccepted < MIN_INTERVAL_MS) {
    return {
      ok: false,
      retryAfterSec: Math.max(
        1,
        Math.ceil((state.lastAccepted + MIN_INTERVAL_MS - now) / 1000),
      ),
      remaining: Math.max(0, PER_IP_LIMIT - state.hits.length),
      limit: PER_IP_LIMIT,
      reason: 'burst',
    };
  }

  if (state.hits.length >= PER_IP_LIMIT) {
    state.strikes.push(now);
    return {
      ok: false,
      retryAfterSec: retryAfterFrom(state.hits, WINDOW_MS, now),
      remaining: 0,
      limit: PER_IP_LIMIT,
      reason: 'ip-window',
    };
  }
  if (state.hourHits.length >= PER_IP_HOURLY_LIMIT) {
    state.strikes.push(now);
    return {
      ok: false,
      retryAfterSec: retryAfterFrom(state.hourHits, HOUR_MS, now),
      remaining: 0,
      limit: PER_IP_HOURLY_LIMIT,
      reason: 'ip-hourly',
    };
  }
  if (globalHits.length >= GLOBAL_LIMIT) {
    return {
      ok: false,
      retryAfterSec: retryAfterFrom(globalHits, WINDOW_MS, now),
      remaining: 0,
      limit: GLOBAL_LIMIT,
      reason: 'global',
    };
  }
  if (globalHourHits.length >= GLOBAL_HOURLY_LIMIT) {
    return {
      ok: false,
      retryAfterSec: retryAfterFrom(globalHourHits, HOUR_MS, now),
      remaining: 0,
      limit: GLOBAL_HOURLY_LIMIT,
      reason: 'global-hourly',
    };
  }

  state.hits.push(now);
  state.hourHits.push(now);
  state.lastAccepted = now;
  globalHits.push(now);
  globalHourHits.push(now);
  return {
    ok: true,
    retryAfterSec: 0,
    remaining: PER_IP_LIMIT - state.hits.length,
    limit: PER_IP_LIMIT,
  };
}

/** Test hook: reset all state. */
export function resetRateLimiter(): void {
  perIp.clear();
  globalHits.length = 0;
  globalHourHits.length = 0;
}

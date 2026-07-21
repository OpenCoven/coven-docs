// Sliding-window rate limiting for the /api/ask-salem bridge.
//
// Why the bridge needs its own limiter: Salem enforces a per-IP quota keyed on
// the *connection* IP (it ignores X-Forwarded-For, so the quota cannot be
// spoofed away — verified 2026-07-21). Every request proxied through this docs
// deployment therefore shares ONE upstream bucket (the deployment's egress
// IP). Without a local gate, a single visitor could drain that shared bucket
// and lock out everyone else — or hammer Salem itself.
//
// The store is in-memory and per-instance. That is acceptable here: the
// production site (docs.opencoven.ai) sends widget traffic browser→Salem
// directly (Salem's CORS allowlists that origin), so the bridge only serves
// local dev and preview deployments, where traffic is a trickle and instances
// are few. The limits below deliberately sum to less than Salem's upstream
// quota so even N cold instances rarely overrun it.

interface Bucket {
  /** ms timestamps of accepted requests, oldest first */
  hits: number[];
}

export interface LimitDecision {
  ok: boolean;
  /** seconds until the caller may retry (0 when ok) */
  retryAfterSec: number;
  /** requests remaining in the window for this key (after this hit) */
  remaining: number;
  limit: number;
}

const WINDOW_MS = 180_000; // 3 minutes — matches Salem's observed window
export const PER_IP_LIMIT = 4; // per visitor per window
export const GLOBAL_LIMIT = 8; // whole instance per window; Salem allows 10
const MAX_TRACKED_IPS = 2_000;

const perIp = new Map<string, Bucket>();
const globalBucket: Bucket = { hits: [] };

function prune(bucket: Bucket, now: number): void {
  const cutoff = now - WINDOW_MS;
  while (bucket.hits.length > 0 && bucket.hits[0] <= cutoff) bucket.hits.shift();
}

function retryAfter(bucket: Bucket, now: number): number {
  if (bucket.hits.length === 0) return 0;
  return Math.max(1, Math.ceil((bucket.hits[0] + WINDOW_MS - now) / 1000));
}

/** Sweep dead buckets so the map cannot grow without bound. */
function sweep(now: number): void {
  for (const [key, bucket] of perIp) {
    prune(bucket, now);
    if (bucket.hits.length === 0) perIp.delete(key);
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

/**
 * Record-and-check a request from `ip`. Consumes quota only when allowed, so
 * rejected requests do not extend the caller's own lockout.
 */
export function checkRateLimit(ip: string, now = Date.now()): LimitDecision {
  sweep(now);
  prune(globalBucket, now);

  const bucket = perIp.get(ip) ?? { hits: [] };
  prune(bucket, now);

  if (bucket.hits.length >= PER_IP_LIMIT) {
    return {
      ok: false,
      retryAfterSec: retryAfter(bucket, now),
      remaining: 0,
      limit: PER_IP_LIMIT,
    };
  }
  if (globalBucket.hits.length >= GLOBAL_LIMIT) {
    return {
      ok: false,
      retryAfterSec: retryAfter(globalBucket, now),
      remaining: 0,
      limit: PER_IP_LIMIT,
    };
  }

  bucket.hits.push(now);
  perIp.set(ip, bucket);
  globalBucket.hits.push(now);
  return {
    ok: true,
    retryAfterSec: 0,
    remaining: PER_IP_LIMIT - bucket.hits.length,
    limit: PER_IP_LIMIT,
  };
}

/** Test hook: reset all buckets. */
export function resetRateLimiter(): void {
  perIp.clear();
  globalBucket.hits = [];
}

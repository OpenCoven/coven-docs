// Single request path for api-runner blocks. 'sim' dispatches to the in-page
// DaemonSim (dynamically imported on first use, ~200ms fake latency); 'live'
// goes through the existing /api/coven-proxy bridge (Unix socket first,
// loopback TCP fallback — see lib/coven-proxy-dial.ts). Browser-only module.

import type { DaemonSim } from '@/lib/api-sim/daemon-sim';

export type Mode = 'sim' | 'live';

export interface TransportResult {
  status: number;
  json: unknown;
  ms: number;
}

export interface ProbeResult {
  available: boolean;
  reason: 'hosted' | 'unreachable' | null;
}

const PROXY_PREFIX = '/api/coven-proxy';
const SIM_LATENCY_MS = 200;

let simInstance: Promise<DaemonSim> | null = null;

function getSim(): Promise<DaemonSim> {
  if (!simInstance) {
    simInstance = import('@/lib/api-sim/daemon-sim').then((m) => new m.DaemonSim());
    // Do not cache a rejection: a transient chunk-load failure (e.g. stale
    // hashes after a redeploy) should retry on the next Run.
    simInstance.catch(() => {
      simInstance = null;
    });
  }
  return simInstance;
}

/** Drop sim state (used by the console's "Reset demo"). */
export function resetSim(): void {
  simInstance = null;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runRequest(
  mode: Mode,
  method: string,
  path: string,
  body?: unknown,
): Promise<TransportResult> {
  const started = performance.now();

  if (mode === 'sim') {
    const sim = await getSim();
    await delay(SIM_LATENCY_MS);
    const res = sim.handle(method, path, body);
    return { status: res.status, json: res.json, ms: Math.round(performance.now() - started) };
  }

  const response = await fetch(PROXY_PREFIX + path, {
    method,
    cache: 'no-store',
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { status: response.status, json, ms: Math.round(performance.now() - started) };
}

/**
 * One health probe decides whether the Live toggle is enabled. Mirrors the
 * transport states: reachable, hosted, and unreachable.
 */
export async function probeDaemon(): Promise<ProbeResult> {
  try {
    const res = await fetch(`${PROXY_PREFIX}/api/v1/health`, { cache: 'no-store' });
    const json = (await res.json().catch(() => null)) as
      | { apiVersion?: string; error?: { code?: string; details?: { hosted?: boolean } } }
      | null;
    if (res.ok && json && 'apiVersion' in json) return { available: true, reason: null };
    if (json?.error?.code === 'daemon_unreachable') {
      return { available: false, reason: json.error.details?.hosted ? 'hosted' : 'unreachable' };
    }
    return { available: false, reason: 'unreachable' };
  } catch {
    return { available: false, reason: 'unreachable' };
  }
}

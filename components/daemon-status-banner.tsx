'use client';

// Polls /api/coven-proxy/api/v1/health and renders a status banner above the
// OpenAPI Try It panels. Five states:
//
//   - loading      → brief placeholder on first mount
//   - connected    → green pill: contract version, binary version, pid
//   - hosted       → blue panel: docs site is on Vercel; Try It is local-only
//   - unreachable  → amber panel: socket isn't responding; show `coven daemon start`
//   - error        → red pill: unexpected proxy or network failure
//
// The component is standalone — no fumadocs-openapi dependency. Phase 7's
// landing page imports it as <DaemonStatusBanner />.

import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';

const HEALTH_URL = '/api/coven-proxy/api/v1/health';
const POLL_INTERVAL_MS = 30_000;

interface HealthPayload {
  ok: boolean;
  apiVersion: string;
  covenVersion: string;
  capabilities?: Record<string, unknown>;
  daemon: { pid: number; startedAt: string; socket: string } | null;
}

interface ErrorPayload {
  error: {
    code: string;
    message: string;
    details?: {
      hosted?: boolean;
      socketPath?: string;
      cause?: string;
      [key: string]: unknown;
    };
  };
}

type State =
  | { kind: 'loading' }
  | { kind: 'connected'; health: HealthPayload }
  | { kind: 'hosted'; socketPath: string }
  | { kind: 'unreachable'; socketPath: string; cause: string }
  | { kind: 'error'; message: string };

function shortSocket(p?: string): string {
  if (!p) return '$COVEN_HOME/coven.sock';
  return p.replace(/^\/Users\/[^/]+/, '~').replace(/^\/home\/[^/]+/, '~');
}

export function DaemonStatusBanner() {
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [checking, setChecking] = useState(false);
  const aborter = useRef<AbortController | null>(null);

  const check = useCallback(async () => {
    aborter.current?.abort();
    const ac = new AbortController();
    aborter.current = ac;
    setChecking(true);
    try {
      const res = await fetch(HEALTH_URL, { signal: ac.signal, cache: 'no-store' });
      const body = (await res.json().catch(() => null)) as
        | HealthPayload
        | ErrorPayload
        | null;

      if (res.ok && body && 'apiVersion' in body) {
        setState({ kind: 'connected', health: body });
        return;
      }
      if (body && 'error' in body && body.error.code === 'daemon_unreachable') {
        const details = body.error.details ?? {};
        const socketPath = (details.socketPath as string) ?? '$COVEN_HOME/coven.sock';
        if (details.hosted) setState({ kind: 'hosted', socketPath });
        else setState({ kind: 'unreachable', socketPath, cause: String(details.cause ?? 'unknown') });
        return;
      }
      setState({
        kind: 'error',
        message: (body as ErrorPayload | null)?.error?.message ?? `HTTP ${res.status}`,
      });
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return;
      setState({ kind: 'error', message: (err as Error).message });
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    check();
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') void check();
    }, POLL_INTERVAL_MS);
    return () => {
      window.clearInterval(id);
      aborter.current?.abort();
    };
  }, [check]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="not-prose my-4 rounded-[var(--radius-md)] border text-sm overflow-hidden"
      data-state={state.kind}
      style={borderForState(state.kind)}
    >
      {renderHeader(state, checking, check)}
      {renderBody(state)}
    </div>
  );
}

function borderForState(kind: State['kind']): React.CSSProperties {
  // Subtle tinted border + background per state. Falls back to the violet
  // glassmorphism that the rest of the docs site uses.
  switch (kind) {
    case 'connected':
      return {
        borderColor: 'rgba(74, 222, 128, 0.25)',
        background: 'rgba(74, 222, 128, 0.05)',
      };
    case 'hosted':
      return {
        borderColor: 'rgba(96, 165, 250, 0.25)',
        background: 'rgba(96, 165, 250, 0.05)',
      };
    case 'unreachable':
      return {
        borderColor: 'rgba(251, 191, 36, 0.3)',
        background: 'rgba(251, 191, 36, 0.06)',
      };
    case 'error':
      return {
        borderColor: 'rgba(248, 113, 113, 0.3)',
        background: 'rgba(248, 113, 113, 0.06)',
      };
    case 'loading':
    default:
      return {
        borderColor: 'rgba(154, 142, 205, 0.15)',
        background: 'rgba(154, 142, 205, 0.04)',
      };
  }
}

function renderHeader(state: State, checking: boolean, refresh: () => void) {
  return (
    <div className="flex items-center gap-2 px-4 py-2.5">
      <StatusDot kind={state.kind} />
      <div className="flex-1 min-w-0">{renderHeadline(state)}</div>
      <button
        type="button"
        onClick={refresh}
        aria-label="Re-check daemon status"
        disabled={checking}
        className={`${buttonVariants({ color: 'ghost', size: 'sm' })} gap-1.5 shrink-0 disabled:opacity-50`}
      >
        <Icon
          icon="ph:arrows-clockwise-duotone"
          width={14}
          aria-hidden="true"
          className={checking ? 'animate-spin' : undefined}
        />
        {checking ? 'Checking' : 'Refresh'}
      </button>
    </div>
  );
}

function StatusDot({ kind }: { kind: State['kind'] }) {
  const cls = 'inline-block w-2 h-2 rounded-full shrink-0';
  switch (kind) {
    case 'connected':
      return <span aria-hidden="true" className={cls} style={{ background: '#4ade80' }} />;
    case 'hosted':
      return <span aria-hidden="true" className={cls} style={{ background: '#60a5fa' }} />;
    case 'unreachable':
      return <span aria-hidden="true" className={cls} style={{ background: '#fbbf24' }} />;
    case 'error':
      return <span aria-hidden="true" className={cls} style={{ background: '#f87171' }} />;
    case 'loading':
    default:
      return <span aria-hidden="true" className={`${cls} animate-pulse`} style={{ background: '#9a8ecd' }} />;
  }
}

function renderHeadline(state: State) {
  switch (state.kind) {
    case 'loading':
      return (
        <span className="text-fd-muted-foreground">Checking daemon status…</span>
      );
    case 'connected': {
      const { apiVersion, covenVersion, daemon } = state.health;
      return (
        <span className="font-medium">
          Connected
          <span className="text-fd-muted-foreground"> · {apiVersion}</span>
          <span className="text-fd-muted-foreground"> · v{covenVersion}</span>
          {daemon?.pid !== undefined && (
            <span className="text-fd-muted-foreground"> · pid {daemon.pid}</span>
          )}
        </span>
      );
    }
    case 'hosted':
      return (
        <span className="font-medium">
          Hosted docs &mdash; Try It panels are local-only
        </span>
      );
    case 'unreachable':
      return (
        <span className="font-medium">
          No daemon listening at <code className="font-mono text-xs">{shortSocket(state.socketPath)}</code>
        </span>
      );
    case 'error':
      return (
        <span className="font-medium">
          Health check failed: <span className="font-normal text-fd-muted-foreground">{state.message}</span>
        </span>
      );
  }
}

function renderBody(state: State) {
  switch (state.kind) {
    case 'hosted':
      return (
        <div className="px-4 pb-3 pt-1 text-fd-muted-foreground text-xs space-y-1.5">
          <p>To enable the Try It buttons on this page, run the docs site locally on the same machine as a Coven daemon:</p>
          <ol className="list-decimal list-inside space-y-0.5 pl-1">
            <li>Clone <code className="font-mono">OpenCoven/coven-docs</code></li>
            <li>Run <code className="font-mono">pnpm install &amp;&amp; pnpm dev</code></li>
            <li>In another terminal: <code className="font-mono">coven daemon start</code></li>
            <li>Reload this page</li>
          </ol>
        </div>
      );
    case 'unreachable':
      return (
        <div className="px-4 pb-3 pt-1 text-fd-muted-foreground text-xs space-y-1.5">
          <p>Start the daemon, then click Refresh:</p>
          <pre className="font-mono text-xs leading-relaxed bg-fd-background/40 rounded px-3 py-2">
{`coven daemon start
coven daemon status   # verify pid + socket`}
          </pre>
          <p className="opacity-70">Cause: <code className="font-mono">{state.cause}</code></p>
        </div>
      );
    case 'loading':
    case 'connected':
    case 'error':
      return null;
  }
}

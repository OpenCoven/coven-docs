// Canned data for the in-page simulated daemon. Shapes mirror
// openapi/coven.daemon.v1.yaml (SessionRecord/EventRecord are snake_case).
// No React, no path aliases — runs under `node --experimental-strip-types`.

export type SessionStatus =
  | 'created'
  | 'running'
  | 'completed'
  | 'failed'
  | 'killed'
  | 'orphaned';

export interface SessionRecord {
  id: string;
  project_root: string;
  harness: string;
  title: string;
  status: SessionStatus;
  exit_code: number | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  conversation_id: string | null;
  familiar_id: string | null;
  labels: string[];
  visibility: string;
  external: boolean;
  transcript_path: string | null;
}

export type EventKind =
  | 'output'
  | 'input'
  | 'status'
  | 'exit'
  | 'kill'
  | 'capabilities.refreshed';

export interface EventRecord {
  seq: number;
  id: string;
  session_id: string;
  kind: EventKind;
  payload_json: string;
  created_at: string;
}

export const SIM_EPOCH = '2026-01-01T00:00:00.000Z';

export const SUPPORTED_HARNESSES = ['codex', 'claude'] as const;

export const HEALTH = {
  ok: true,
  apiVersion: 'coven.daemon.v1',
  covenVersion: '0.0.0-sim',
  capabilities: {
    sessions: true,
    events: true,
    travel: true,
    scheduler: true,
    hub: true,
    executorDispatch: true,
    eventCursor: 'sequence',
    structuredErrors: true,
  },
  daemon: {
    pid: 424242,
    startedAt: SIM_EPOCH,
    socket: '/home/demo/.coven/coven.sock',
  },
} as const;

function simTime(offsetSeconds: number): string {
  return new Date(Date.parse(SIM_EPOCH) + offsetSeconds * 1000).toISOString();
}

export interface CreateSessionInput {
  projectRoot: string;
  harness: string;
  prompt: string;
  cwd?: string;
  title?: string;
}

export function makeSessionRecord(id: string, input: CreateSessionInput): SessionRecord {
  return {
    id,
    project_root: input.projectRoot,
    harness: input.harness,
    title: input.title ?? 'Untitled session',
    status: 'created',
    exit_code: null,
    archived_at: null,
    created_at: simTime(0),
    updated_at: simTime(0),
    conversation_id: null,
    familiar_id: null,
    labels: [],
    visibility: 'private',
    external: false,
    transcript_path: null,
  };
}

/** Scripted 12-event session timeline: status → 9 output chunks → exit → status. */
export const TIMELINE: { kind: EventKind; payload: Record<string, unknown> }[] = [
  { kind: 'status', payload: { status: 'running' } },
  { kind: 'output', payload: { data: 'Scanning repository…\n' } },
  { kind: 'output', payload: { data: 'Reading package manifest and lockfile\n' } },
  { kind: 'output', payload: { data: 'Walking source tree (src/, lib/, tests/)\n' } },
  { kind: 'output', payload: { data: '• A CLI-first tool with a small daemon core\n' } },
  { kind: 'output', payload: { data: '• Sessions wrap harness runs with an event log\n' } },
  { kind: 'output', payload: { data: '• Storage is a single append-only store\n' } },
  { kind: 'output', payload: { data: '• Tests colocate with the crates they cover\n' } },
  { kind: 'output', payload: { data: '• Docs live in a separate content pipeline\n' } },
  { kind: 'output', payload: { data: 'Done — summary in 5 bullets above.\n' } },
  { kind: 'exit', payload: { code: 0 } },
  { kind: 'status', payload: { status: 'completed' } },
];

export function timelineEvents(sessionId: string): EventRecord[] {
  return TIMELINE.map((entry, index) => ({
    seq: index + 1,
    id: `evt_${sessionId}_${String(index + 1).padStart(2, '0')}`,
    session_id: sessionId,
    kind: entry.kind,
    payload_json: JSON.stringify(entry.payload),
    created_at: simTime(index + 1),
  }));
}

/** Pre-existing completed session so the list step never returns []. */
export const SEED_SESSION: SessionRecord = {
  ...makeSessionRecord('ses_demo_00', {
    projectRoot: '/home/demo/code/demo-repo',
    harness: 'claude',
    prompt: 'seed',
    title: 'Demo: summarize the repo',
  }),
  status: 'completed',
  exit_code: 0,
  updated_at: simTime(30),
};

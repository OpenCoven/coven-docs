// Stateful in-page fake daemon for the docs guides. Implements only the
// coven.daemon.v1 routes that guides exercise, with real validation, error
// envelopes, and event-cursor mechanics. Deterministic: identical action
// sequences produce identical outputs. Latency is added by the transport
// layer, not here, so tests stay fast.
// No React, no path aliases — runs under `node --experimental-strip-types`.

import {
  HEALTH,
  SEED_SESSION,
  SUPPORTED_HARNESSES,
  makeSessionRecord,
  timelineEvents,
} from './fixtures.ts';
import type { EventRecord, SessionRecord } from './fixtures.ts';

export interface SimResponse {
  status: number;
  json: unknown;
}

/** Events made visible per poll of /events for a live session. */
const RELEASE_PER_POLL = 5;
const EVENTS_LIMIT_CAP = 1000;

interface SimSession {
  record: SessionRecord;
  events: EventRecord[];
  released: number;
}

function errorEnvelope(
  status: number,
  code: string,
  message: string,
  details: Record<string, unknown> = {},
): SimResponse {
  return { status, json: { error: { code, message, details } } };
}

function isInsideRoot(cwd: string, projectRoot: string): boolean {
  return cwd === projectRoot || cwd.startsWith(`${projectRoot}/`);
}

export class DaemonSim {
  private sessions = new Map<string, SimSession>();
  private launchCounter = 0;

  constructor() {
    const seedEvents = timelineEvents(SEED_SESSION.id);
    this.sessions.set(SEED_SESSION.id, {
      record: { ...SEED_SESSION },
      events: seedEvents,
      released: seedEvents.length,
    });
  }

  handle(method: string, pathWithQuery: string, body?: unknown): SimResponse {
    let url: URL;
    try {
      url = new URL(pathWithQuery, 'http://localhost');
    } catch {
      return errorEnvelope(400, 'invalid_request', 'Malformed request path.', { path: pathWithQuery });
    }
    const route = `${method.toUpperCase()} ${url.pathname}`;

    if (route === 'GET /api/v1/health') return { status: 200, json: HEALTH };
    if (route === 'GET /api/v1/sessions') return this.listSessions();
    if (route === 'POST /api/v1/sessions') return this.createSession(body);
    if (route === 'GET /api/v1/events') return this.listEvents(url.searchParams);

    const sessionMatch = /^GET \/api\/v1\/sessions\/([^/]+)$/.exec(route);
    if (sessionMatch) {
      let sessionId: string;
      try {
        sessionId = decodeURIComponent(sessionMatch[1]);
      } catch {
        return errorEnvelope(400, 'invalid_request', 'Malformed request path.', { path: pathWithQuery });
      }
      return this.getSession(sessionId);
    }

    return errorEnvelope(404, 'not_found', 'Route was not found.', {
      method: method.toUpperCase(),
      path: url.pathname,
    });
  }

  private listSessions(): SimResponse {
    const records = [...this.sessions.values()]
      .map((s) => s.record)
      .filter((r) => r.archived_at === null);
    return { status: 200, json: records };
  }

  private getSession(id: string): SimResponse {
    const session = this.sessions.get(id);
    if (!session) {
      return errorEnvelope(404, 'session_not_found', 'Session was not found.', {
        sessionId: id,
      });
    }
    return { status: 200, json: session.record };
  }

  private createSession(body: unknown): SimResponse {
    if (body === null || typeof body !== 'object') {
      return errorEnvelope(400, 'invalid_request', 'Request body must be a JSON object.');
    }
    const input = body as Record<string, unknown>;
    for (const field of ['projectRoot', 'harness', 'prompt'] as const) {
      if (typeof input[field] !== 'string' || input[field] === '') {
        return errorEnvelope(400, 'invalid_request', `Missing required field: ${field}.`, {
          field,
        });
      }
    }
    const projectRoot = input.projectRoot as string;
    const harness = input.harness as string;
    if (!(SUPPORTED_HARNESSES as readonly string[]).includes(harness)) {
      return errorEnvelope(400, 'invalid_request', `Unsupported harness id: ${harness}.`, {
        harness,
        supported: [...SUPPORTED_HARNESSES],
      });
    }
    const cwd = typeof input.cwd === 'string' && input.cwd !== '' ? input.cwd : projectRoot;
    if (!isInsideRoot(cwd, projectRoot)) {
      return errorEnvelope(
        400,
        'project_root_violation',
        'cwd resolves outside the declared project root.',
        { cwd, projectRoot },
      );
    }

    this.launchCounter += 1;
    const id = `ses_demo_${String(this.launchCounter).padStart(2, '0')}`;
    const record = makeSessionRecord(id, {
      projectRoot,
      harness,
      prompt: input.prompt as string,
      cwd,
      title: typeof input.title === 'string' ? input.title : undefined,
    });
    this.sessions.set(id, { record, events: timelineEvents(id), released: 0 });
    return { status: 201, json: record };
  }

  private listEvents(params: URLSearchParams): SimResponse {
    const sessionId = params.get('sessionId');
    if (!sessionId) {
      return errorEnvelope(400, 'invalid_request', 'sessionId query parameter is required.');
    }
    const session = this.sessions.get(sessionId);
    if (!session) {
      return errorEnvelope(404, 'session_not_found', 'Session was not found.', { sessionId });
    }

    const afterSeq = Number(params.get('afterSeq') ?? '0');
    const rawLimit = Number(params.get('limit') ?? '100');
    if (!Number.isInteger(afterSeq) || afterSeq < 0 || !Number.isInteger(rawLimit)) {
      return errorEnvelope(400, 'invalid_request', 'afterSeq must be a non-negative integer and limit an integer.');
    }
    const limit = Math.min(Math.max(rawLimit, 1), EVENTS_LIMIT_CAP);

    // Each poll of a not-yet-finished session "releases" the next batch of
    // scripted events, then status advances: created → running → completed.
    if (session.released < session.events.length) {
      session.released = Math.min(session.released + RELEASE_PER_POLL, session.events.length);
      const done = session.released === session.events.length;
      session.record = {
        ...session.record,
        status: done ? 'completed' : 'running',
        exit_code: done ? 0 : null,
        updated_at: new Date(
          Date.parse(session.record.created_at) + session.released * 1000,
        ).toISOString(),
      };
    }

    const visible = session.events.slice(0, session.released);
    const page = visible.filter((event) => event.seq > afterSeq).slice(0, limit);
    const lastSeq = page.length > 0 ? page[page.length - 1].seq : null;
    const hasMore = lastSeq !== null && visible.some((event) => event.seq > lastSeq);

    return {
      status: 200,
      json: {
        events: page,
        nextCursor: lastSeq === null ? null : { afterSeq: lastSeq },
        hasMore,
      },
    };
  }
}

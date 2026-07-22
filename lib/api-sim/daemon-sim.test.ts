import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import {
  HEALTH,
  SEED_SESSION,
  SUPPORTED_HARNESSES,
  TIMELINE,
  makeSessionRecord,
  timelineEvents,
} from './fixtures.ts';

interface OpenApiDoc {
  components: {
    schemas: Record<
      string,
      { required?: string[]; enum?: string[]; properties?: Record<string, unknown> }
    >;
  };
}

const spec = yaml.load(
  fs.readFileSync(path.join(process.cwd(), 'openapi/coven.daemon.v1.yaml'), 'utf8'),
) as OpenApiDoc;

test('session record fixtures carry every field the spec requires', () => {
  const required = spec.components.schemas.SessionRecord.required ?? [];
  assert.ok(required.length > 0, 'spec should list required SessionRecord fields');
  const record = makeSessionRecord('ses_demo_01', {
    projectRoot: '/Users/you/code/your-repo',
    harness: 'codex',
    prompt: 'explain this repo in 5 bullets',
    title: 'API launch smoke test',
  });
  for (const field of required) {
    assert.ok(field in record, `SessionRecord fixture missing spec field: ${field}`);
  }
  assert.equal(record.status, 'created');
  for (const field of required) {
    assert.ok(field in SEED_SESSION, `seed session missing spec field: ${field}`);
  }
});

test('timeline events use spec-valid kinds and required fields', () => {
  const kinds = spec.components.schemas.EventKind.enum ?? [];
  const required = spec.components.schemas.EventRecord.required ?? [];
  assert.ok(kinds.length > 0 && required.length > 0);
  const events = timelineEvents('ses_demo_01');
  assert.equal(events.length, TIMELINE.length);
  assert.equal(events.length, 12);
  events.forEach((event, i) => {
    assert.ok(kinds.includes(event.kind), `invalid kind: ${event.kind}`);
    assert.equal(event.seq, i + 1);
    assert.equal(event.session_id, 'ses_demo_01');
    for (const field of required) {
      assert.ok(field in event, `event missing spec field: ${field}`);
    }
    assert.doesNotThrow(() => JSON.parse(event.payload_json));
  });
  assert.equal(events[events.length - 1].kind, 'status');
});

test('health fixture matches the contract handshake', () => {
  assert.equal(HEALTH.ok, true);
  assert.equal(HEALTH.apiVersion, 'coven.daemon.v1');
  assert.ok(HEALTH.capabilities.structuredErrors);
  assert.deepEqual([...SUPPORTED_HARNESSES], ['codex', 'claude']);
});

import { DaemonSim } from './daemon-sim.ts';

function launchBody(overrides: Record<string, unknown> = {}) {
  return {
    projectRoot: '/Users/you/code/your-repo',
    cwd: '/Users/you/code/your-repo',
    harness: 'codex',
    prompt: 'explain this repo in 5 bullets',
    title: 'API launch smoke test',
    ...overrides,
  };
}

test('GET /health returns the handshake payload', () => {
  const sim = new DaemonSim();
  const res = sim.handle('GET', '/api/v1/health');
  assert.equal(res.status, 200);
  assert.deepEqual(res.json, HEALTH);
});

test('GET /sessions starts with the seed session', () => {
  const sim = new DaemonSim();
  const res = sim.handle('GET', '/api/v1/sessions');
  assert.equal(res.status, 200);
  const list = res.json as { id: string }[];
  assert.equal(list.length, 1);
  assert.equal(list[0].id, 'ses_demo_00');
});

test('POST /sessions launches deterministically and lists the new session', () => {
  const sim = new DaemonSim();
  const res = sim.handle('POST', '/api/v1/sessions', launchBody());
  assert.equal(res.status, 201);
  const record = res.json as { id: string; status: string; harness: string };
  assert.equal(record.id, 'ses_demo_01');
  assert.equal(record.status, 'created');
  assert.equal(record.harness, 'codex');
  const again = new DaemonSim().handle('POST', '/api/v1/sessions', launchBody());
  assert.deepEqual(again.json, res.json, 'same actions must produce same outputs');
  const list = sim.handle('GET', '/api/v1/sessions').json as { id: string }[];
  assert.deepEqual(list.map((s) => s.id).sort(), ['ses_demo_00', 'ses_demo_01']);
});

test('POST /sessions validates like the daemon', () => {
  const sim = new DaemonSim();

  const missing = sim.handle('POST', '/api/v1/sessions', { harness: 'codex' });
  assert.equal(missing.status, 400);
  assert.equal((missing.json as { error: { code: string } }).error.code, 'invalid_request');

  const badHarness = sim.handle('POST', '/api/v1/sessions', launchBody({ harness: 'warp' }));
  assert.equal(badHarness.status, 400);
  assert.equal((badHarness.json as { error: { code: string } }).error.code, 'invalid_request');

  const escape = sim.handle('POST', '/api/v1/sessions', launchBody({ cwd: '/tmp/elsewhere' }));
  assert.equal(escape.status, 400);
  assert.equal(
    (escape.json as { error: { code: string } }).error.code,
    'project_root_violation',
  );
});

test('GET /sessions/{id} returns the record or session_not_found', () => {
  const sim = new DaemonSim();
  const ok = sim.handle('GET', '/api/v1/sessions/ses_demo_00');
  assert.equal(ok.status, 200);
  assert.equal((ok.json as { id: string }).id, 'ses_demo_00');

  const gone = sim.handle('GET', '/api/v1/sessions/does-not-exist');
  assert.equal(gone.status, 404);
  const envelope = gone.json as { error: { code: string; details: { sessionId: string } } };
  assert.equal(envelope.error.code, 'session_not_found');
  assert.equal(envelope.error.details.sessionId, 'does-not-exist');
});

test('unknown routes return the not_found envelope', () => {
  const sim = new DaemonSim();
  const res = sim.handle('GET', '/api/v1/nope');
  assert.equal(res.status, 404);
  assert.equal((res.json as { error: { code: string } }).error.code, 'not_found');
});

interface EventsPage {
  events: { seq: number; kind: string }[];
  nextCursor: { afterSeq: number } | null;
  hasMore: boolean;
}

function launchAndGetId(sim: DaemonSim): string {
  const res = sim.handle('POST', '/api/v1/sessions', launchBody());
  assert.equal(res.status, 201);
  return (res.json as { id: string }).id;
}

test('events release per poll and page with cursors', () => {
  const sim = new DaemonSim();
  const id = launchAndGetId(sim);

  const poll1 = sim.handle('GET', `/api/v1/events?sessionId=${id}&afterSeq=0&limit=100`)
    .json as EventsPage;
  assert.equal(poll1.events.length, 5);
  assert.deepEqual(poll1.nextCursor, { afterSeq: 5 });
  assert.equal(poll1.hasMore, false, 'poll drained everything released so far');

  const running = sim.handle('GET', `/api/v1/sessions/${id}`).json as { status: string };
  assert.equal(running.status, 'running');

  const poll2 = sim.handle('GET', `/api/v1/events?sessionId=${id}&afterSeq=5&limit=100`)
    .json as EventsPage;
  assert.equal(poll2.events.length, 5);
  assert.deepEqual(poll2.nextCursor, { afterSeq: 10 });

  const poll3 = sim.handle('GET', `/api/v1/events?sessionId=${id}&afterSeq=10&limit=100`)
    .json as EventsPage;
  assert.equal(poll3.events.length, 2);
  assert.deepEqual(poll3.nextCursor, { afterSeq: 12 });
  assert.equal(poll3.hasMore, false);

  const done = sim.handle('GET', `/api/v1/sessions/${id}`).json as {
    status: string;
    exit_code: number | null;
  };
  assert.equal(done.status, 'completed');
  assert.equal(done.exit_code, 0);

  const empty = sim.handle('GET', `/api/v1/events?sessionId=${id}&afterSeq=12&limit=100`)
    .json as EventsPage;
  assert.deepEqual(empty.events, []);
  assert.equal(empty.nextCursor, null, 'empty page must return null cursor');
  assert.equal(empty.hasMore, false);
});

test('limit truncates within released events and sets hasMore', () => {
  const sim = new DaemonSim();
  const id = launchAndGetId(sim);
  const page = sim.handle('GET', `/api/v1/events?sessionId=${id}&afterSeq=0&limit=2`)
    .json as EventsPage;
  assert.equal(page.events.length, 2);
  assert.deepEqual(page.nextCursor, { afterSeq: 2 });
  assert.equal(page.hasMore, true, 'released events remain beyond the returned page');
});

test('events validate sessionId and cursor params', () => {
  const sim = new DaemonSim();
  const missing = sim.handle('GET', '/api/v1/events');
  assert.equal(missing.status, 400);
  assert.equal((missing.json as { error: { code: string } }).error.code, 'invalid_request');

  const unknown = sim.handle('GET', '/api/v1/events?sessionId=nope&afterSeq=0');
  assert.equal(unknown.status, 404);
  assert.equal((unknown.json as { error: { code: string } }).error.code, 'session_not_found');

  const id = launchAndGetId(sim);
  const bad = sim.handle('GET', `/api/v1/events?sessionId=${id}&afterSeq=banana`);
  assert.equal(bad.status, 400);
});

test('seed session events are fully available without polls', () => {
  const sim = new DaemonSim();
  const page = sim.handle('GET', '/api/v1/events?sessionId=ses_demo_00&afterSeq=0&limit=100')
    .json as EventsPage;
  assert.equal(page.events.length, 12);
  assert.equal(page.hasMore, false);
});

// Fix 1: handle() must never throw on malformed input
test('handle() returns 400 for malformed path without throwing', () => {
  const sim = new DaemonSim();

  const res1 = sim.handle('GET', '/api/v1/sessions/100%');
  assert.equal(res1.status, 400);
  assert.equal((res1.json as { error: { code: string } }).error.code, 'invalid_request');

  const res2 = sim.handle('GET', 'http://[bad');
  assert.equal(res2.status, 400);
  assert.equal((res2.json as { error: { code: string } }).error.code, 'invalid_request');
});

// Fix 2: error envelopes must always include details per spec
test('error envelopes always carry details per ErrorEnvelope spec required fields', () => {
  const errorInner = (
    spec.components.schemas.ErrorEnvelope.properties?.error as { required?: string[] }
  );
  const errorRequired = errorInner?.required ?? [];
  assert.ok(errorRequired.length > 0, 'spec ErrorEnvelope.error should list required fields');

  const sim = new DaemonSim();
  // POST with null body goes through errorEnvelope() without a details arg — currently omits it
  const res = sim.handle('POST', '/api/v1/sessions', null);
  const envelope = res.json as { error: Record<string, unknown> };
  for (const field of errorRequired) {
    assert.ok(field in envelope.error, `error envelope missing spec-required field: ${field}`);
  }
});

// Fix 3: events limit=0 clamps to 1 rather than rejecting
test('events limit=0 clamps to 1 event (status 200)', () => {
  const sim = new DaemonSim();
  const res = sim.handle('GET', '/api/v1/events?sessionId=ses_demo_00&afterSeq=0&limit=0');
  assert.equal(res.status, 200);
  const page = res.json as EventsPage;
  assert.equal(page.events.length, 1);
});

// Fix 4: omitted title defaults to the prompt
test('POST /sessions without title sets title to the prompt', () => {
  const sim = new DaemonSim();
  const prompt = 'explain this repo in 5 bullets';
  const res = sim.handle('POST', '/api/v1/sessions', {
    projectRoot: '/Users/you/code/your-repo',
    cwd: '/Users/you/code/your-repo',
    harness: 'codex',
    prompt,
  });
  assert.equal(res.status, 201);
  assert.equal((res.json as { title: string }).title, prompt);
});

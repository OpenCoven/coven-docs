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

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

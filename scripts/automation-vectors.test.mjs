import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { VECTOR_SUITES, formatInstant, vectorColumns, vectorProblems, vectorRows, wallTime } from '../lib/automation-vectors.mjs';

const root = resolve(import.meta.dirname, '..');
const load = (suite) =>
  JSON.parse(readFileSync(resolve(root, `content/data/upstream/coven-automations-conformance/${suite}.vectors.json`), 'utf8'));

test('every pinned suite has the shape its table renders, one row per case', () => {
  for (const suite of VECTOR_SUITES) {
    const doc = load(suite);
    assert.deepEqual(vectorProblems(suite, doc), [], suite);
    const rows = vectorRows(suite, doc);
    assert.equal(rows.length, doc.cases.length, suite);
    const keys = vectorColumns(suite).map(({ key }) => key);
    for (const row of rows) assert.deepEqual(Object.keys(row).sort(), [...keys].sort(), suite);
  }
});

for (const [label, suite, mutate, error] of [
  ['a new case field', 'calendar-schedule-resolution', (doc) => { doc.cases[0].minute = 30; }, /fields the page does not render: minute/],
  ['a new outcome', 'rrule-vocabulary', (doc) => { doc.cases[0].expected.outcome = 'approximated'; }, /expectation the page does not render/],
  ['a new schema version', 'overlap-forbid-claiming', (doc) => { doc.schemaVersion = 'coven.automations.overlap-forbid-claiming-vectors.v2'; }, /the page renders/],
  ['a backfill misfire policy', 'misfire-latest-planning', (doc) => { doc.cases[0].definition.misfire = 'backfill'; }, /unexpected definition/],
  ['a duplicated case', 'occurrence-lease-recovery', (doc) => { doc.cases.push(structuredClone(doc.cases[0])); }, /appears twice/],
  ['a delay outside its range', 'retry-backoff-timing', (doc) => { doc.cases[2].expected.delaySeconds = 999; }, /outside its range/],
  ['an unknown top-level field', 'retry-quarantine-recovery', (doc) => { doc.generatedAt = 'now'; }, /exactly \{ schemaVersion, cases \}/],
]) {
  test(`a suite with ${label} fails`, () => {
    const doc = load(suite);
    mutate(doc);
    assert.match(vectorProblems(suite, doc).join('\n'), error);
  });
}

test('each scheduled calendar slot falls on one of its BYHOUR hours in its own zone', () => {
  for (const c of load('calendar-schedule-resolution').cases) {
    if (c.expected.outcome !== 'scheduled') continue;
    const hours = (/BYHOUR=([\d,]+)/i.exec(c.rrule)?.[1] ?? '9').split(',').map(Number);
    const wall = wallTime(c.expected.nextDueAt, c.timezone);
    assert.ok(hours.includes(Number(wall.slice(11, 13))), `${c.caseId}: ${wall}`);
    assert.ok(Date.parse(c.expected.nextDueAt) > Date.parse(c.from), c.caseId);
  }
});

test('the spring-forward case skips the missing hour and the fall-back case takes the earlier instant', () => {
  const cases = Object.fromEntries(load('calendar-schedule-resolution').cases.map((c) => [c.scenario, c]));
  assert.equal(wallTime(cases.dst_spring_gap.expected.nextDueAt, 'America/New_York'), '2026-03-09 02:00 EDT');
  assert.equal(wallTime(cases.dst_fall_fold.expected.nextDueAt, 'America/New_York'), '2026-11-01 01:00 EDT');
});

test('exponential ceilings and retry times follow the documented rule', () => {
  for (const c of load('retry-backoff-timing').cases) {
    assert.equal(Date.parse(c.expected.notBefore) - Date.parse(c.observedAt), c.expected.delaySeconds * 1000, c.caseId);
    if (c.policy.backoffPolicy === 'exponential') {
      const ceiling = Math.min(c.policy.backoffSeconds * 2 ** (c.nextAttemptNumber - 2), 86_400);
      assert.equal(c.expected.ceilingSeconds, ceiling, c.caseId);
      assert.equal(c.expected.minimumDelaySeconds, 1, c.caseId);
    }
  }
});

test('instants keep sub-minute precision only when it is there', () => {
  assert.equal(formatInstant('2026-09-01T10:00:00.000Z'), '2026-09-01 10:00');
  assert.equal(formatInstant('2026-09-01T09:59:59.999Z'), '2026-09-01 09:59:59.999');
  assert.equal(formatInstant('2099-10-01T08:29:45.000Z'), '2099-10-01 08:29:45');
});

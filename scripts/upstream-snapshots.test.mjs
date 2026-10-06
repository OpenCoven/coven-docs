import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { SNAPSHOTS_PATH, gitBlobSha, snapshotProblems } from './upstream-snapshots.mjs';
import {
  STATE_MACHINE_IDS,
  findStateMachine,
  stateMachineChart,
  stateMachineProblems,
  transitionRows,
} from '../lib/automation-state-machines.mjs';

const root = resolve(import.meta.dirname, '..');
const json = (path) => JSON.parse(readFileSync(resolve(root, path), 'utf8'));
const readLocal = (path) => {
  try {
    return readFileSync(resolve(root, path));
  } catch {
    return null;
  }
};
const machinesPath = 'content/data/upstream/coven-automations-v1/state-machines.json';

test('blob ids match git hash-object', () => {
  assert.equal(gitBlobSha(Buffer.alloc(0)), 'e69de29bb2d1d6434b8b29ae775ad8c2e48c5391');
  assert.equal(gitBlobSha(Buffer.from('hello\n')), 'ce013625030ba8dba906f756967f9e9ca394464a');
});

test('the committed snapshots are the recorded upstream blobs at the pin', () => {
  assert.deepEqual(snapshotProblems(json(SNAPSHOTS_PATH), json('docs/source-lock.json'), readLocal), []);
});

test('an edited copy, a stale pin, or an unwatched path fails', () => {
  const lock = json('docs/source-lock.json');
  const edited = (path) => {
    const bytes = readLocal(path);
    return path === machinesPath ? Buffer.concat([bytes, Buffer.from(' ')]) : bytes;
  };
  assert.match(snapshotProblems(json(SNAPSHOTS_PATH), lock, edited).join('\n'), /is not upstream blob/);

  const stale = { ...json(SNAPSHOTS_PATH), verifiedCommit: '0'.repeat(40) };
  assert.match(snapshotProblems(stale, lock, readLocal).join('\n'), /but docs\/source-lock.json is at/);

  const unwatched = structuredClone(lock);
  unwatched.sources[0].paths = unwatched.sources[0].paths.filter((path) => !path.endsWith('/state-machines.json'));
  assert.match(snapshotProblems(json(SNAPSHOTS_PATH), unwatched, readLocal).join('\n'), /must stay in docs\/source-lock.json paths/);

  assert.match(snapshotProblems(json(SNAPSHOTS_PATH), lock, () => null).join('\n'), /is missing/);
});

test('the pinned state machines have the shape the lifecycle page renders', () => {
  assert.deepEqual(stateMachineProblems(json(machinesPath)), []);
});

for (const [label, mutate, error] of [
  ['an undeclared state', (doc) => { doc.machines[0].transitions[0].to = 'nowhere'; }, /undeclared state nowhere/],
  ['a transition out of a terminal state', (doc) => {
    const machine = doc.machines[0];
    machine.transitions.push({ from: machine.terminalStates[0], to: machine.initial, on: 'reopen', actor: 'scheduler' });
  }, /leaves terminal state/],
  ['an unknown transition field', (doc) => { doc.machines[0].transitions[0].priority = 1; }, /is not \{ from, to, on, actor, guard\? \}/],
  ['a renamed machine', (doc) => { doc.machines[0].id = 'occurrence.v2'; }, /the page has sections for/],
  ['a disagreeing terminal list', (doc) => { doc.machines[0].terminalStates.pop(); }, /disagree with its terminal states/],
  ['a new profile', (doc) => { doc.contractProfile = 'coven.automations.v2'; }, /documents coven.automations.v1/],
]) {
  test(`state machines with ${label} fail`, () => {
    const doc = json(machinesPath);
    mutate(doc);
    assert.match(stateMachineProblems(doc).join('\n'), error);
  });
}

test('every transition reaches both the diagram and the table', () => {
  const doc = json(machinesPath);
  for (const id of STATE_MACHINE_IDS) {
    const machine = findStateMachine(doc, id);
    const chart = stateMachineChart(machine);
    assert.ok(chart.startsWith('stateDiagram-v2\n'));
    assert.ok(chart.includes(`[*] --> ${machine.initial}\n`));
    for (const { from, to, on } of machine.transitions) assert.ok(chart.includes(`  ${from} --> ${to}: ${on}\n`), `${id} ${from} -> ${to}`);
    assert.equal(transitionRows(machine).length, machine.transitions.length);
  }
  assert.throws(() => findStateMachine(doc, 'lease.v1'), /no lease.v1 machine/);
});

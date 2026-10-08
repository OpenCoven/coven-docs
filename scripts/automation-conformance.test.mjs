import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { CONFORMANCE_FILES, PROFILES, compiledPins, conformanceFileProblems, ledgerProblems, ledgerRows, profileRows } from '../lib/automation-conformance.mjs';
import { VECTOR_SUITES } from '../lib/automation-vectors.mjs';

const root = resolve(import.meta.dirname, '..');
const raw = (key) => readFileSync(resolve(root, CONFORMANCE_FILES[key].local), 'utf8');
const json = (key) => JSON.parse(raw(key));
const docs = () => Object.fromEntries(Object.keys(CONFORMANCE_FILES).filter((key) => key !== 'cargoToml').map((key) => [key, json(key)]));

test('every pinned ledger file has the shape the page renders, and the files agree', () => {
  for (const key of Object.keys(CONFORMANCE_FILES)) assert.deepEqual(conformanceFileProblems(key, raw(key)), [], key);
  assert.deepEqual(ledgerProblems(docs()), []);
});

test('profiles render in schema order and account for every audit suite', () => {
  const rows = profileRows(json('inventory'));
  assert.deepEqual(rows.map(({ profile }) => profile), PROFILES);
  assert.equal(rows.reduce((sum, { suites }) => sum + suites.length, 0), json('inventory').suites.length);
  // Every suite the scheduling page renders is in the audit.
  const audited = new Set(json('inventory').suites.map(({ suiteId }) => suiteId));
  for (const suite of VECTOR_SUITES) assert.ok(audited.has(suite), suite);
});

const mutateJson = (key, mutate) => {
  const doc = json(key);
  mutate(doc);
  return JSON.stringify(doc);
};

for (const [label, key, content, error] of [
  ['a release-eligibility audit scope', 'inventory', () => mutateJson('inventory', (d) => { d.decisionScope.kind = 'release_eligibility'; }), /audit_only/],
  ['a suite under an unknown profile', 'inventory', () => mutateJson('inventory', (d) => { d.suites[0].profile = 'durability'; }), /unknown profile durability/],
  ['a new result profile', 'resultSchema', () => mutateJson('resultSchema', (d) => { d.$defs.profile.enum.push('durability'); }), /the page describes/],
  ['a new manifest field', 'baseManifest', () => mutateJson('baseManifest', (d) => { d.certifiedAt = '2026-10-08'; }), /must have exactly/],
  ['a stable release state the page would misreport', 'authorityManifest', () => mutateJson('authorityManifest', (d) => { d.releaseState = 'certified'; }), /releaseState certified/],
  ['a branch instead of an exact revision', 'cargoToml', () => raw('cargoToml').replace(/familiar-contract = \{ git = "([^"]+)", rev = "[0-9a-f]{40}"/, 'familiar-contract = { git = "$1", branch = "main"'), /familiar-contract is not a single/],
  ['a short revision', 'cargoToml', () => raw('cargoToml').replace(/(coven-threads-core = \{ git = "[^"]+", rev = ")([0-9a-f]{40})"/, (_, head, sha) => `${head}${sha.slice(0, 12)}"`), /not a full commit/],
]) {
  test(`a ledger file with ${label} fails`, () => {
    assert.match(conformanceFileProblems(key, content()).join('\n'), error);
  });
}

test('the authority manifest and protocol must name the same inputs', () => {
  const all = docs();
  all.authorityManifest.normativeInputs[0].commit = '0'.repeat(40);
  assert.match(ledgerProblems(all).join('\n'), /different normative inputs/);
});

test('whether a specification input matches the compiled crate is computed', () => {
  const base = {
    reviewedCommit: 'a'.repeat(40),
    repo: 'OpenCoven/coven',
    baseProtocol: json('baseProtocol'),
    baseManifest: json('baseManifest'),
    authorityProtocol: json('authorityProtocol'),
    authorityManifest: json('authorityManifest'),
    inventory: json('inventory'),
  };
  const pinned = compiledPins(raw('cargoToml')).pins;
  const rows = ledgerRows({ ...base, cargoToml: raw('cargoToml') });
  assert.equal(rows.familiar.agree, base.authorityProtocol.normativeInputs.familiarContract.commit === pinned['familiar-contract'].ref);
  const aligned = raw('cargoToml').replace(pinned['familiar-contract'].ref, base.authorityProtocol.normativeInputs.familiarContract.commit);
  assert.equal(ledgerRows({ ...base, cargoToml: aligned }).familiar.agree, true);
  assert.equal(rows.runner.suites, base.inventory.suites.length);
});

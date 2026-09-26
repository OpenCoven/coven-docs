import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

// Documentation regression checks, not runtime conformance. Reviewed against
// OpenCoven/coven@801e9f219b1d50336ad4111ca92ce2a3a1eafa3c/docs/API-CONTRACT.md:
// reusable client, structured errors, and stable error codes.
const page = readFileSync(
  resolve(import.meta.dirname, '../content/docs/reference/api.mdx'),
  'utf8',
);

function section(source, heading) {
  const matches = [...source.matchAll(/^## (.+)$/gmu)];
  const named = matches.filter((match) => match[1] === heading);
  assert.equal(named.length, 1, `expected one ${heading} section`);
  const start = named[0].index + named[0][0].length;
  const next = matches.find((match) => match.index > start);
  return source.slice(start, next?.index ?? source.length);
}

function requireErrorExample(source) {
  const errors = section(source, 'Error envelope');
  const examples = [...errors.matchAll(/^```json\r?\n([\s\S]*?)^```\s*$/gmu)];
  assert.equal(examples.length, 1, 'expected one structured-error JSON example');
  const payload = JSON.parse(examples[0][1]);
  assert.deepEqual(Object.keys(payload), ['error']);
  assert.equal(payload.error.code, 'invalid_request');
  assert.equal(typeof payload.error.message, 'string');
  assert.ok(payload.error.message.length > 0);
  assert.match(errors, /`project_root_violation` is reserved/u);
}

function requirePeerRecovery(source) {
  const client = section(source, 'Rust client and peer replacement').replace(/\s+/gu, ' ');
  assert.ok(client.includes('DaemonEndpoint::discover(coven_home)'));
  assert.ok(client.includes('DaemonClient::new'));
  assert.ok(client.includes('before sending request bytes'));
  assert.ok(client.includes('clears the cached negotiation'));
  assert.ok(client.includes('re-check capabilities'));
  assert.ok(client.includes('never replays a mutation automatically'));
}

function requirePolicyRefusal(source) {
  const refusal = section(source, 'Session-policy admission refusals').replace(/\s+/gu, ' ');
  assert.ok(refusal.includes('separately negotiated'));
  assert.ok(refusal.includes('HTTP `409`'));
  assert.ok(refusal.includes('not a launch success'));
  assert.ok(refusal.includes('must not retry the request as an unrestricted launch'));
  assert.ok(refusal.includes('availability, not authorization'));
}

test('the published error example uses the emitted code, not its reserved successor', () => {
  requireErrorExample(page);
});

test('the Rust client recovery instructions preserve the no-replay boundary', () => {
  requirePeerRecovery(page);
});

test('session-policy refusal is not described as launch or authorization', () => {
  requirePolicyRefusal(page);
});

for (const [name, mutate] of [
  ['reserved error code', (source) => source.replace('"code": "invalid_request"', '"code": "project_root_violation"')],
  ['missing example', (source) => source.replace(/^```json\n[\s\S]*?^```\n/mu, '')],
  ['malformed JSON', (source) => source.replace('"code": "invalid_request"', '"code": undefined')],
  ['duplicate error section', (source) => `${source}\n## Error envelope\n`],
  ['duplicate JSON example', (source) => source.replace('Use `error.code`', '```json\n{"error":{"code":"invalid_request","message":"duplicate"}}\n```\n\nUse `error.code`')],
]) {
  test(`refuses documentation drift: ${name}`, () => {
    const mutated = mutate(page);
    assert.notEqual(mutated, page, 'mutation must modify the actual page');
    assert.throws(() => requireErrorExample(mutated));
  });
}

test('removing the no-auto-replay qualification is detected', () => {
  const mutated = page.replace('never replays a mutation automatically', 'replays a mutation automatically');
  assert.notEqual(mutated, page);
  assert.throws(() => requirePeerRecovery(mutated));
});

test('removing the unrestricted-fallback prohibition is detected', () => {
  const mutated = page.replace('must not retry the request as an unrestricted launch', 'may retry the request as an unrestricted launch');
  assert.notEqual(mutated, page);
  assert.throws(() => requirePolicyRefusal(mutated));
});

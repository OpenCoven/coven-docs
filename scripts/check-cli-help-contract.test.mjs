import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { checkCliHelpContract, loadRepoCliHelpInputs } from './check-cli-help-contract.mjs';
import { collectAnchors } from './mdx-anchors.mjs';

function changeCapture(inputs, mutate, recordNewHash = false) {
  const contract = JSON.parse(inputs.rawContract);
  mutate(contract);
  inputs.rawContract = `${JSON.stringify(contract, null, 2)}\n`;
  if (recordNewHash) inputs.provenance.capture.sha256 = createHash('sha256').update(inputs.rawContract).digest('hex');
}

test('current capture covers every public command and resolves the setup redirect', () => {
  const inputs = loadRepoCliHelpInputs();
  assert.deepEqual(checkCliHelpContract(inputs), { commands: 42, groups: 6 });
  inputs.rawContract = inputs.rawContract.replace(/\r\n?/g, '\n').replaceAll('\n', '\r\n');
  assert.doesNotThrow(() => checkCliHelpContract(inputs));
  inputs.redirects.delete('/docs/reference/cli-setup');
  assert.throws(() => checkCliHelpContract(inputs), /missing route \/docs\/reference\/cli-setup/);
});

for (const [label, mutate] of [
  ['group order', (c) => c.groups.reverse()],
  ['command order', (c) => c.groups[0].commands.reverse()],
  ['summary', (c) => { c.groups[0].commands[0].summary = 'Changed meaning'; }],
  ['destination', (c) => { c.groups[0].commands[0].docsUrl = 'https://docs.opencoven.ai/docs/cli/run'; }],
  ['removed public command', (c) => c.groups[0].commands.pop()],
]) {
  test(`unrecorded ${label} drift fails`, () => {
    const inputs = loadRepoCliHelpInputs();
    changeCapture(inputs, mutate);
    assert.throws(() => checkCliHelpContract(inputs), /differs from the recorded capture/);
  });
}

for (const [label, mutate, error] of [
  ['schema', (c) => { c.schemaVersion = 2; }, /Unsupported help schema/],
  ['unknown field', (c) => { c.groups[0].commands[0].extra = true; }, /unexpected fields/],
  ['duplicate command', (c) => { c.groups[0].commands.push(c.groups[0].commands[0]); }, /duplicate command/],
  ['hidden command', (c) => { c.groups[0].commands[0].name = 'serve'; }, /Hidden command/],
  ['foreign origin', (c) => { c.groups[0].commands[0].docsUrl = 'https://example.com/docs/cli'; }, /canonical docs URL/],
  ['query', (c) => { c.groups[0].commands[0].docsUrl += '?preview=1'; }, /Invalid docs destination/],
  ['ANSI summary', (c) => { c.groups[0].commands[0].summary = '\u001b[31mdoctor'; }, /control characters/],
]) {
  test(`newly recorded captures still reject invalid ${label}`, () => {
    const inputs = loadRepoCliHelpInputs();
    changeCapture(inputs, mutate, true);
    assert.throws(() => checkCliHelpContract(inputs), error);
  });
}

test('source updates require reconciliation, including identical capture-source blobs', () => {
  const inputs = loadRepoCliHelpInputs();
  inputs.sourceLock.sources[0].verifiedCommit = 'a'.repeat(40);
  assert.throws(() => checkCliHelpContract(inputs), /source-lock pin/);
  const other = loadRepoCliHelpInputs();
  other.provenance.sourceBlobs[0].capturedSourceBlob = 'a'.repeat(40);
  assert.throws(() => checkCliHelpContract(other), /match the captured CLI source/);
  const unwatched = loadRepoCliHelpInputs();
  unwatched.sourceLock.sources[0].paths = unwatched.sourceLock.sources[0].paths.filter((p) => !p.endsWith('/help.rs'));
  assert.throws(() => checkCliHelpContract(unwatched), /freshness watch/);
});

test('compact JSON is rejected independently of the capture hash', () => {
  const inputs = loadRepoCliHelpInputs();
  inputs.rawContract = JSON.stringify(JSON.parse(inputs.rawContract));
  assert.throws(() => checkCliHelpContract(inputs), /deterministic pretty JSON/);
});

test('every command needs its own table link, including shared destinations and new commands', () => {
  for (const name of ['help', 'chat', 'device', 'setup', 'config', 'memory', 'kill', 'completions', 'reset']) {
    const inputs = loadRepoCliHelpInputs();
    const removed = [];
    inputs.cliIndexSource = inputs.cliIndexSource.replace(/\[`(coven [^`]+)`\]\(([^)]+)\)/g, (link, label) => {
      if (label === `coven ${name}` || label.startsWith(`coven ${name} `)) { removed.push(link); return `\`${label}\``; }
      return link;
    });
    assert(removed.length > 0, `${name} mutation must remove a real link`);
    inputs.cliIndexSource += `\nUnrelated prose: ${removed.join(' ')}\n\n\`\`\`md\n| ${removed[0]} | example |\n\`\`\`\n<!--\n| ${removed[0]} | comment |\n-->\n`;
    assert.throws(() => checkCliHelpContract(inputs), new RegExp(`must link coven ${name} to`));
  }
});

test('command-prefix lookalikes and wrong targets cannot satisfy the command map', () => {
  const inputs = loadRepoCliHelpInputs();
  inputs.cliIndexSource = inputs.cliIndexSource.replace('[`coven chat`]', '[`coven chatter`]');
  assert.throws(() => checkCliHelpContract(inputs), /must link coven chat to/);
  const other = loadRepoCliHelpInputs();
  other.cliIndexSource = other.cliIndexSource.replace('[`coven kill <session-id>`](/docs/cli/sessions#kill)', '[`coven kill <session-id>`](/docs/cli/sessions#archive)');
  assert.throws(() => checkCliHelpContract(other), /must link coven kill to/);
});

test('canonical routes and both canonical and preferred fragments remain valid', () => {
  const missingRoute = loadRepoCliHelpInputs();
  missingRoute.routeIndex.delete('/docs/memory-models');
  assert.throws(() => checkCliHelpContract(missingRoute), /memory points to missing route/);
  for (const fragment of ['attach', 'kill']) {
    const inputs = loadRepoCliHelpInputs();
    inputs.routeIndex.get('/docs/cli/sessions').delete(fragment);
    assert.throws(() => checkCliHelpContract(inputs), /missing anchor/);
  }
  const cycle = loadRepoCliHelpInputs();
  cycle.redirects.set('/docs/cli/setup', '/docs/reference/cli-setup');
  assert.throws(() => checkCliHelpContract(cycle), /Redirect cycle/);
});

test('shared anchor rules ignore fenced headings and retain duplicate-heading suffixes', () => {
  assert.deepEqual([...collectAnchors('## Attach\n```md\n## Hidden\n```\n## Attach\n## **Kill**\n')], ['attach', 'attach-1', 'kill']);
});

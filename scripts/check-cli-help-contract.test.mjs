import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { checkCliHelpContract, loadRepoCliHelpInputs } from './check-cli-help-contract.mjs';
import { collectAnchors, stripCodeFences } from './mdx-anchors.mjs';

function changeCapture(inputs, mutate, recordNewHash = false) {
  const contract = JSON.parse(inputs.rawContract);
  mutate(contract);
  inputs.rawContract = `${JSON.stringify(contract, null, 2)}\n`;
  if (recordNewHash) inputs.provenance.capture.sha256 = createHash('sha256').update(inputs.rawContract).digest('hex');
}

test('current capture covers every public command and resolves the setup redirect', () => {
  const inputs = loadRepoCliHelpInputs();
  assert.deepEqual(checkCliHelpContract(inputs), { commands: 44, groups: 6 });
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
    inputs.cliIndexSource = inputs.cliIndexSource.replace('## Command map',
      `## Command map\n\nUnrelated prose: ${removed.join(' ')}\n\n\`\`\`md\n| ${removed[0]} | example |\n\`\`\`\n<!--\n| ${removed[0]} | comment |\n-->\n{ /*\n| ${removed[0]} | MDX comment |\n*/ }\n`);
    inputs.cliIndexSource += `\n## Unrelated commands\n\n| Command | Purpose |\n| --- | --- |\n| ${removed[0]} | outside the command map |\n`;
    assert.throws(() => checkCliHelpContract(inputs), new RegExp(`must link coven ${name} to`));
  }
});

test('missing or duplicate command-map sections fail instead of broadening the scan', () => {
  for (const source of ['missing', 'duplicate']) {
    const inputs = loadRepoCliHelpInputs();
    inputs.cliIndexSource = source === 'missing'
      ? inputs.cliIndexSource.replace('## Command map', '## Other commands')
      : `${inputs.cliIndexSource}\n## Command map\n`;
    assert.throws(() => checkCliHelpContract(inputs), /exactly one Command map section/);
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

test('every repeated command row must use its preferred destination', () => {
  for (const name of ['setup', 'daemon', 'sessions', 'run']) {
    const inputs = loadRepoCliHelpInputs();
    const row = new RegExp(`(\\[\`coven ${name}(?: [^\`]+)?\`\\]\\()([^)]+)(\\))`, 'g');
    assert([...inputs.cliIndexSource.matchAll(row)].length > 1, `${name} must have multiple real rows`);
    let changed = false;
    inputs.cliIndexSource = inputs.cliIndexSource.replace(row, (link, start, href, end) => {
      if (changed) return link;
      changed = true;
      return `${start}/docs/cli/doctor${end}`;
    });
    assert.throws(() => checkCliHelpContract(inputs), new RegExp(`Every coven ${name} row must link to`));
  }
});

test('stale or hidden command-map rows cannot survive a newly recorded capture', () => {
  const removed = loadRepoCliHelpInputs();
  changeCapture(removed, (c) => {
    for (const group of c.groups) group.commands = group.commands.filter(({ name }) => name !== 'device');
  }, true);
  removed.provenance.commandCount -= 1;
  assert.throws(() => checkCliHelpContract(removed), /Unknown command-map verb: device/);
  for (const name of ['retired-command', 'serve']) {
    const inputs = loadRepoCliHelpInputs();
    inputs.cliIndexSource = inputs.cliIndexSource.replace('## Command map',
      `## Command map\n\n| [\`coven ${name}\`](/docs/cli/doctor) | stale row |\n`);
    assert.throws(() => checkCliHelpContract(inputs), new RegExp(`Unknown command-map verb: ${name}`));
  }
});

test('unlinked extra rows and a misdirected root command are rejected', () => {
  for (const label of ['coven daemon status', 'coven retired-command']) {
    const inputs = loadRepoCliHelpInputs();
    inputs.cliIndexSource = inputs.cliIndexSource.replace('## Command map',
      `## Command map\n\n| \`${label}\` | unlinked row |\n`);
    assert.throws(() => checkCliHelpContract(inputs), /Every command-map row must contain a linked coven command/);
  }
  const inputs = loadRepoCliHelpInputs();
  inputs.cliIndexSource = inputs.cliIndexSource.replace('[`coven`](/docs/cli/interactive)', '[`coven`](/docs/cli/doctor)');
  assert.throws(() => checkCliHelpContract(inputs), /Every coven row must link to/);
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

test('fences require matching markers and sufficient length before exposing headings', () => {
  for (const marker of ['`', '~']) {
    const other = marker === '`' ? '~' : '`';
    for (const indent of ['', ' ', '   ']) {
      const source = [
        '## Before', `${indent}${marker.repeat(4)}md`, '## Hidden',
        other.repeat(4), '## Wrong marker', marker.repeat(3), '## Short closer',
        `${marker.repeat(4)} still code`, '## Trailing text',
        `    ${marker.repeat(4)}`, '## Indented closer',
        `${indent}${marker.repeat(5)}\t`, '## After',
      ].join('\r\n');
      assert.deepEqual([...collectAnchors(source)], ['before', 'after']);
    }
    assert.deepEqual([...collectAnchors(`## Before\n${marker.repeat(3)}md\n## Unclosed`)], ['before']);
  }
  const inline = '```not a fence`\n## Visible';
  assert.equal(stripCodeFences(inline), inline);
});

test('code samples cannot replace a command-map row with either fence style', () => {
  for (const fence of ['~~~', '````']) {
    const inputs = loadRepoCliHelpInputs();
    const row = /^\| \[`coven help`\].*$/m;
    const match = inputs.cliIndexSource.match(row);
    assert(match, 'mutation must remove the live help row');
    inputs.cliIndexSource = inputs.cliIndexSource.replace(row, '');
    const shortCloser = fence === '````' ? '```\n' : '';
    inputs.cliIndexSource = inputs.cliIndexSource.replace('## Command map',
      `## Command map\n\n${fence}md\n${shortCloser}${match[0]}\n${fence}\n`);
    assert.throws(() => checkCliHelpContract(inputs), /must link coven help to/);
  }
});

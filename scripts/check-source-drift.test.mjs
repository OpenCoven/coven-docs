import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const A = 'a'.repeat(40);
const B = 'b'.repeat(40);
const C = 'c'.repeat(40);
const D = 'd'.repeat(40);
const E = 'e'.repeat(40);
const F = 'f'.repeat(40);
const prefix = '/repos/OpenCoven/example';
const script = readFileSync(resolve(import.meta.dirname, 'check-source-drift.mjs'), 'utf8');
const entry = (path, sha = E, mode = '100644', type = 'blob') => ({ path, sha, mode, type });
const commit = (sha, tree, date = '2026-09-01T00:00:00Z') => ({
  sha, commit: { tree: { sha: tree }, committer: { date } },
});
const tree = (sha, entries) => ({ sha, truncated: false, tree: entries });

function fixture() {
  const lock = { schemaVersion: 1, sources: [{
    id: 'runtime', repo: 'OpenCoven/example', ref: 'main',
    verifiedCommit: A, verifiedAt: '2026-09-02T00:00:00Z',
    sections: ['guide'], paths: ['contract.md'],
  }] };
  const comparison = { status: 'ahead', base_commit: { sha: A }, merge_base_commit: { sha: A } };
  const replies = {
    [`${prefix}/commits/${A}`]: commit(A, B),
    [`${prefix}/commits/main`]: commit(C, D, '2026-09-03T00:00:00Z'),
    [`${prefix}/compare/${A}...${C}?per_page=1`]: comparison,
    [`${prefix}/git/trees/${B}`]: tree(B, [entry('contract.md')]),
    [`${prefix}/git/trees/${D}`]: tree(D, [entry('contract.md')]),
    // Also model the old CLI's time-filtered API calls. Empty date-filtered
    // history is NOT proof that the pinned file still has its reviewed bytes.
    [`${prefix}/compare/${A}...main`]: comparison,
    [`${prefix}/commits?sha=main&path=contract.md&since=2026-09-02T00%3A00%3A00Z&per_page=100`]: [],
  };
  return { lock, replies };
}

function run(input) {
  const dir = mkdtempSync(join(tmpdir(), 'docs-source-drift-'));
  try {
    mkdirSync(join(dir, 'scripts'));
    mkdirSync(join(dir, 'docs'));
    writeFileSync(join(dir, 'scripts/check-source-drift.mjs'), script);
    writeFileSync(join(dir, 'docs/source-lock.json'), JSON.stringify(input.lock));
    writeFileSync(join(dir, 'fixture.json'), JSON.stringify(input.replies));
    writeFileSync(join(dir, 'mock.mjs'), `
      import { readFileSync, appendFileSync } from 'node:fs';
      const replies = JSON.parse(readFileSync('fixture.json', 'utf8'));
      Date.now = () => Date.parse('2026-09-14T00:00:00Z');
      globalThis.fetch = async (input) => {
        const u = new URL(input);
        const key = u.pathname + u.search;
        appendFileSync('requests.jsonl', JSON.stringify(key) + '\\n');
        if (!Object.hasOwn(replies, key)) throw new Error('Unexpected request: ' + key);
        const value = replies[key];
        if (value && value.__throw) throw new Error(value.__throw);
        if (value && value.__status) return new Response('DO-NOT-LOG-REMOTE-BODY', { status: value.__status });
        return new Response(JSON.stringify(value));
      };
    `);
    const result = spawnSync(process.execPath, ['--import', './mock.mjs', 'scripts/check-source-drift.mjs'], {
      cwd: dir,
      encoding: 'utf8',
      timeout: 5_000,
      env: { ...process.env, GITHUB_TOKEN: '', GITHUB_API_URL: 'https://api.github.com', DOCS_DRIFT_REPORT_PATH: 'report.json' },
    });
    assert.ifError(result.error);
    const report = JSON.parse(readFileSync(join(dir, 'report.json'), 'utf8'));
    let requests = [];
    try { requests = readFileSync(join(dir, 'requests.jsonl'), 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse); } catch { /* Lock rejection can precede any request. */ }
    return { ...result, report, requests };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function expectDrift(input) {
  const result = run(input);
  assert.equal(result.status, 1, result.stderr);
  assert.equal(result.report.ok, false);
  assert.equal(result.report.error, undefined, result.report.error);
  assert.equal(result.report.changedPathCount, 1);
  assert.equal(result.report.sources[0].refCommit, C);
  return result;
}
function expectFailure(input) {
  const result = run(input);
  assert.equal(result.status, 1, result.stderr);
  assert.equal(result.report.ok, false);
  assert.equal(typeof result.report.error, 'string');
  return result;
}

test('unchanged watched bytes pass even if unrelated files changed', () => {
  const f = fixture();
  f.replies[`${prefix}/git/trees/${D}`].tree.push(entry('unrelated.md', F));
  const result = run(f);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.report.changedPathCount, 0);
  assert.equal(result.report.sources[0].refCommit, C);
});

test('late-merged old-dated change cannot hide behind verifiedAt', () => {
  const f = fixture();
  f.replies[`${prefix}/commits/main`].commit.committer.date = '2026-09-01T12:00:00Z';
  f.replies[`${prefix}/git/trees/${D}`].tree[0].sha = F;
  const result = expectDrift(f);
  assert.ok(result.requests.every((request) => !request.includes('since=')));
});

test('a moving ref is sampled once and never queried for path history', () => {
  const f = fixture();
  f.replies[`${prefix}/git/trees/${D}`].tree[0].sha = F;
  const result = expectDrift(f);
  assert.equal(result.requests.filter((request) => request === `${prefix}/commits/main`).length, 1);
  assert.ok(result.requests.includes(`${prefix}/compare/${A}...${C}?per_page=1`));
  assert.ok(!result.requests.some((request) => request.includes('...main') || request.includes('/commits?')));
});

test('deletion is drift', () => {
  const f = fixture();
  f.replies[`${prefix}/git/trees/${D}`].tree = [];
  assert.equal(expectDrift(f).report.sources[0].paths[0].after, null);
});

test('addition is drift', () => {
  const f = fixture();
  f.replies[`${prefix}/git/trees/${B}`].tree = [];
  assert.equal(expectDrift(f).report.sources[0].paths[0].before, null);
});

for (const mode of ['100755', '120000']) {
  test(`mode change to ${mode} is drift even at the same blob SHA`, () => {
    const f = fixture();
    f.replies[`${prefix}/git/trees/${D}`].tree[0].mode = mode;
    expectDrift(f);
  });
}

test('missing from both snapshots is an invalid watch, not success', () => {
  const f = fixture();
  f.replies[`${prefix}/git/trees/${B}`].tree = [];
  f.replies[`${prefix}/git/trees/${D}`].tree = [];
  expectFailure(f);
});

for (const variant of ['truncated', 'missing-truncated', 'wrong-sha', 'duplicate', 'malformed']) {
  test(`incomplete tree ${variant} fails closed`, () => {
    const f = fixture();
    const t = f.replies[`${prefix}/git/trees/${D}`];
    if (variant === 'truncated') t.truncated = true;
    if (variant === 'missing-truncated') delete t.truncated;
    if (variant === 'wrong-sha') t.sha = B;
    if (variant === 'duplicate') t.tree.push(t.tree[0]);
    if (variant === 'malformed') t.tree[0].sha = 'bad';
    expectFailure(f);
  });
}

test('comparison file-list truncation cannot conceal a watched path', () => {
  const f = fixture();
  f.replies[`${prefix}/compare/${A}...${C}?per_page=1`].files = Array.from({ length: 300 }, (_, i) => ({ filename: `other-${i}` }));
  f.replies[`${prefix}/git/trees/${D}`].tree[0].sha = F;
  expectDrift(f);
});

for (const status of ['behind', 'diverged', 'unknown']) {
  test(`ancestry ${status} fails closed`, () => {
    const f = fixture();
    f.replies[`${prefix}/compare/${A}...${C}?per_page=1`].status = status;
    expectFailure(f);
  });
}

test('ancestry must bind the verified base and merge base', () => {
  const f = fixture();
  f.replies[`${prefix}/compare/${A}...${C}?per_page=1`].merge_base_commit.sha = C;
  expectFailure(f);
});

test('exact identical commit passes without inventing a new verification boundary', () => {
  const f = fixture();
  f.replies[`${prefix}/commits/main`] = commit(A, B);
  f.replies[`${prefix}/compare/${A}...${A}?per_page=1`] = { status: 'identical', base_commit: { sha: A }, merge_base_commit: { sha: A } };
  const result = run(f);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.report.sources[0].refCommit, A);
  assert.equal(result.requests.filter((request) => request.includes('/git/trees/')).length, 1);
});

test('nested trees are read without recursion and shared tree reads are cached', () => {
  const f = fixture();
  f.lock.sources[0].paths = ['docs/one.md', 'docs/two.md'];
  f.replies[`${prefix}/git/trees/${B}`].tree = [entry('docs', E, '040000', 'tree')];
  f.replies[`${prefix}/git/trees/${D}`].tree = [entry('docs', F, '040000', 'tree')];
  f.replies[`${prefix}/git/trees/${E}`] = tree(E, [entry('one.md', A), entry('two.md', B)]);
  f.replies[`${prefix}/git/trees/${F}`] = tree(F, [entry('one.md', A), entry('two.md', C)]);
  const result = expectDrift(f);
  assert.equal(result.requests.filter((request) => request.includes('/git/trees/')).length, 4);
  assert.ok(result.requests.every((request) => !request.includes('recursive')));
});

test('ancestor symlink replacement is not followed', () => {
  const f = fixture();
  f.lock.sources[0].paths = ['docs/one.md'];
  f.replies[`${prefix}/git/trees/${B}`].tree = [entry('docs', E, '040000', 'tree')];
  f.replies[`${prefix}/git/trees/${D}`].tree = [entry('docs', F, '120000')];
  f.replies[`${prefix}/git/trees/${E}`] = tree(E, [entry('one.md', A)]);
  const result = expectDrift(f);
  assert.equal(result.report.sources[0].paths[0].after.obstructedAt, 'docs');
  assert.ok(!result.requests.includes(`${prefix}/git/trees/${F}`));
});

for (const status of [403, 404, 429, 500]) {
  test(`HTTP ${status} retains a failing report without the response body`, () => {
    const f = fixture();
    f.replies[`${prefix}/git/trees/${D}`] = { __status: status };
    const result = expectFailure(f);
    assert.ok(!JSON.stringify(result.report).includes('DO-NOT-LOG-REMOTE-BODY'));
    assert.ok(!result.stderr.includes('DO-NOT-LOG-REMOTE-BODY'));
  });
}

test('network timeout remains a failure with a report', () => {
  const f = fixture();
  f.replies[`${prefix}/git/trees/${D}`] = { __throw: 'bounded request timeout' };
  expectFailure(f);
});

for (const value of ['not-a-date', '2027-01-01T00:00:00Z', '2026-08-01T00:00:00Z']) {
  test(`invalid review timestamp ${value} fails closed`, () => {
    const f = fixture();
    f.lock.sources[0].verifiedAt = value;
    expectFailure(f);
  });
}

for (const path of ['../contract.md', '/contract.md', 'docs//contract.md']) {
  test(`invalid path ${path} fails closed`, () => {
    const f = fixture();
    f.lock.sources[0].paths = [path];
    expectFailure(f);
  });
}

test('empty lock cannot yield a vacuous green result', () => {
  const f = fixture();
  f.lock.sources = [];
  expectFailure(f);
});

// An unchanged ancestor obstruction is not an unchanged watched leaf. Neither
// snapshot has supplied the bytes named by the lock in these cases.
for (const [mode, type] of [['100644', 'blob'], ['120000', 'blob'], ['160000', 'commit']]) {
  test(`unchanged ancestor ${mode} cannot certify an unresolved watched path`, () => {
    const f = fixture();
    f.lock.sources[0].paths = ['docs/contract.md'];
    f.replies[`${prefix}/git/trees/${B}`].tree = [entry('docs', E, mode, type)];
    f.replies[`${prefix}/git/trees/${D}`].tree = [entry('docs', E, mode, type)];
    const result = expectFailure(f);
    assert.match(result.report.error, /watched path unresolved in both pinned trees/);
    assert.ok(!result.requests.includes(`${prefix}/git/trees/${E}`));
  });
}

for (const obstructed of [B, D]) {
  test(`missing versus obstructed snapshot ${obstructed[0]} cannot certify a leaf`, () => {
    const f = fixture();
    f.lock.sources[0].paths = ['docs/contract.md'];
    f.replies[`${prefix}/git/trees/${B}`].tree = [];
    f.replies[`${prefix}/git/trees/${D}`].tree = [];
    f.replies[`${prefix}/git/trees/${obstructed}`].tree = [entry('docs', E, '120000')];
    const result = expectFailure(f);
    assert.match(result.report.error, /watched path unresolved in both pinned trees/);
  });
}

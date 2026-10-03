import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const gate = resolve(import.meta.dirname, 'docs-release-gate.mjs');
const outcomes = ['success', 'failure', 'cancelled', 'skipped', 'pending', '', undefined];
for (const freshness of outcomes) {
  for (const browser of outcomes) {
    test(`release gate: freshness=${freshness}, browser=${browser}`, () => {
      const env = { ...process.env };
      delete env.DOCS_FRESHNESS_RESULT;
      delete env.DOCS_BROWSER_RESULT;
      if (freshness !== undefined) env.DOCS_FRESHNESS_RESULT = freshness;
      if (browser !== undefined) env.DOCS_BROWSER_RESULT = browser;
      const result = spawnSync(process.execPath, [gate], { env, encoding: 'utf8', timeout: 5_000 });
      assert.ifError(result.error);
      assert.equal(result.status, freshness === 'success' && browser === 'success' ? 0 : 1);
    });
  }
}

test('browser evidence does not depend on freshness; canonical rollup requires both', () => {
  const workflow = readFileSync(resolve(import.meta.dirname, '../.github/workflows/docs.yml'), 'utf8');
  const jobs = Object.fromEntries([...workflow.slice(workflow.indexOf('jobs:\n') + 6).matchAll(/^  ([a-z-]+):\n([\s\S]*?)(?=^  [a-z-]+:\n|$(?![\s\S]))/gm)].map(([, id, body]) => [id, body]));
  assert.deepEqual(Object.keys(jobs).sort(), ['browser', 'freshness', 'verify']);
  assert.doesNotMatch(jobs.browser, /^    (?:needs|if):/m);
  assert.match(jobs.browser, /run: pnpm verify/);
  assert.match(jobs.browser, /pnpm install --frozen-lockfile/);
  assert.match(jobs.browser, /Confirm clean generated tree/);
  assert.match(jobs.freshness, /node scripts\/check-source-lock\.mjs/);
  assert.match(jobs.freshness, /node scripts\/check-source-drift\.mjs/);
  assert.match(jobs.verify, /name: Verify documentation release/);
  assert.match(jobs.verify, /needs: \[freshness, browser\]/);
  assert.match(jobs.verify, /if: \$\{\{ always\(\) \}\}/);
  assert.match(jobs.verify, /DOCS_FRESHNESS_RESULT: \$\{\{ needs\.freshness\.result \}\}/);
  assert.match(jobs.verify, /DOCS_BROWSER_RESULT: \$\{\{ needs\.browser\.result \}\}/);
  assert.match(jobs.verify, /run: node scripts\/docs-release-gate\.mjs/);
  assert.doesNotMatch(workflow, /continue-on-error/);
});

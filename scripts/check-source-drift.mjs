import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import process from 'node:process';

const root = resolve(import.meta.dirname, '..');
const lock = JSON.parse(
  await readFile(resolve(root, 'docs/source-lock.json'), 'utf8'),
);
const apiBase = process.env.GITHUB_API_URL ?? 'https://api.github.com';
const token = process.env.GITHUB_TOKEN?.trim();
const reportPath = resolve(
  process.env.DOCS_DRIFT_REPORT_PATH ?? 'output/docs-source-drift.json',
);

const headers = {
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent': 'coven-docs-source-drift/1',
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
};

async function apiJson(url) {
  const response = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub API ${response.status} for ${url}: ${body.slice(0, 500)}`);
  }
  return response.json();
}

async function writeReport(report) {
  await mkdir(dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
}

const sourceResults = [];
let changedPathCount = 0;

try {
  for (const source of lock.sources) {
    const pathResults = [];
    for (const path of source.paths) {
      const url = new URL(`/repos/${source.repo}/commits`, apiBase);
      url.searchParams.set('sha', source.ref);
      url.searchParams.set('path', path);
      url.searchParams.set('since', source.verifiedAt);
      url.searchParams.set('per_page', '100');
      const commits = await apiJson(url);
      const changes = commits
        .filter((commit) => commit.sha !== source.verifiedCommit)
        .map((commit) => ({
          sha: commit.sha,
          date: commit.commit?.committer?.date ?? commit.commit?.author?.date ?? null,
          summary: commit.commit?.message?.split('\n')[0] ?? '',
          url: commit.html_url,
        }));
      if (changes.length > 0) changedPathCount += 1;
      pathResults.push({ path, changes });
    }
    sourceResults.push({
      id: source.id,
      repo: source.repo,
      ref: source.ref,
      verifiedAt: source.verifiedAt,
      verifiedCommit: source.verifiedCommit,
      sections: source.sections,
      paths: pathResults,
    });
  }

  const report = {
    ok: changedPathCount === 0,
    checkedAt: new Date().toISOString(),
    changedPathCount,
    sources: sourceResults,
  };
  await writeReport(report);

  if (changedPathCount > 0) {
    console.error(
      `Upstream contract drift detected in ${changedPathCount} watched path(s). Review output at ${reportPath}.`,
    );
    process.exit(1);
  }

  console.log(`No upstream contract drift across ${sourceResults.length} source(s).`);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  await writeReport({
    ok: false,
    checkedAt: new Date().toISOString(),
    error: message,
    sources: sourceResults,
  });
  console.error(message);
  process.exit(1);
}

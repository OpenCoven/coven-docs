import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import process from 'node:process';

const root = resolve(import.meta.dirname, '..');
const apiBase = process.env.GITHUB_API_URL ?? 'https://api.github.com';
const token = process.env.GITHUB_TOKEN?.trim();
const reportPath = resolve(
  process.env.DOCS_DRIFT_REPORT_PATH ?? 'output/docs-source-drift.json',
);
const maxClockSkewMs = 5 * 60 * 1_000;
const shaPattern = /^[0-9a-f]{40}$/i;
const headers = {
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent': 'coven-docs-source-drift/1',
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
};

async function apiJson(path) {
  const url = new URL(path, apiBase);
  const response = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) {
    // Do not copy arbitrary API response bodies into public evidence.
    throw new Error(`GitHub API ${response.status} for ${url}`);
  }
  return response.json();
}

async function writeReport(report) {
  await mkdir(dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
}

function commitDate(commit) {
  return commit.commit?.committer?.date ?? commit.commit?.author?.date ?? null;
}

function requireCommit(commit, label, expectedSha) {
  if (
    !shaPattern.test(commit?.sha ?? '') ||
    !shaPattern.test(commit?.commit?.tree?.sha ?? '') ||
    !Number.isFinite(Date.parse(commitDate(commit))) ||
    (expectedSha && commit.sha.toLowerCase() !== expectedSha.toLowerCase())
  ) {
    throw new Error(`${label}: incomplete or mismatched commit identity`);
  }
  return commit;
}

// Non-recursive Git trees preserve mode and symlink/gitlink identity. Contents
// responses can dereference symlinks; compare.files is capped at 300 paths.
const treeCache = new Map();
async function readTree(repo, sha) {
  const key = `${repo}/${sha}`;
  if (treeCache.has(key)) return treeCache.get(key);
  const result = await apiJson(`/repos/${repo}/git/trees/${sha}`);
  if (
    result?.sha !== sha ||
    result.truncated !== false ||
    !Array.isArray(result.tree)
  ) {
    throw new Error(`${repo}: incomplete or mismatched tree ${sha}`);
  }
  const entries = new Map();
  const modes = {
    '040000': 'tree',
    '100644': 'blob',
    '100755': 'blob',
    '120000': 'blob',
    '160000': 'commit',
  };
  for (const entry of result.tree) {
    if (
      typeof entry.path !== 'string' ||
      !entry.path ||
      entry.path.includes('/') ||
      entry.path === '.' ||
      entry.path === '..' ||
      entries.has(entry.path) ||
      !Object.hasOwn(modes, entry.mode) ||
      modes[entry.mode] !== entry.type ||
      !shaPattern.test(entry.sha ?? '')
    ) {
      throw new Error(`${repo}: malformed entry in tree ${sha}`);
    }
    entries.set(entry.path, {
      mode: entry.mode,
      type: entry.type,
      sha: entry.sha,
    });
  }
  treeCache.set(key, entries);
  return entries;
}

async function pathIdentity(repo, treeSha, path) {
  const segments = path.split('/');
  if (
    segments.length > 64 ||
    segments.some((part) => !part || part === '.' || part === '..')
  ) {
    throw new Error(`${repo}: invalid watched repository path ${path}`);
  }
  for (let index = 0; index < segments.length; index += 1) {
    const entry = (await readTree(repo, treeSha)).get(segments[index]);
    if (!entry) return null;
    if (index === segments.length - 1) return entry;
    if (entry.type !== 'tree') {
      // An ancestor replaced by a symlink/file is drift too, not a directory
      // to follow outside the pinned Git tree.
      return { ...entry, obstructedAt: segments.slice(0, index + 1).join('/') };
    }
    treeSha = entry.sha;
  }
}

const sourceResults = [];
let changedPathCount = 0;

try {
  const lock = JSON.parse(
    await readFile(resolve(root, 'docs/source-lock.json'), 'utf8'),
  );
  if (lock.schemaVersion !== 1 || !Array.isArray(lock.sources) || !lock.sources.length) {
    throw new Error('Source lock must contain a non-empty schemaVersion 1 source list');
  }
  for (const source of lock.sources) {
    if (
      !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(source.repo ?? '') ||
      typeof source.ref !== 'string' || !source.ref ||
      !shaPattern.test(source.verifiedCommit ?? '') ||
      !Array.isArray(source.paths) || !source.paths.length ||
      source.paths.some((path) => typeof path !== 'string' || !path) ||
      new Set(source.paths).size !== source.paths.length
    ) {
      throw new Error('Source lock contains an invalid repository, ref, SHA, or path list');
    }
    const verifiedAtMs = Date.parse(source.verifiedAt);
    if (!Number.isFinite(verifiedAtMs) || verifiedAtMs > Date.now() + maxClockSkewMs) {
      throw new Error(`${source.id}: invalid or future verifiedAt`);
    }
    const prefix = `/repos/${source.repo}`;
    const verified = requireCommit(
      await apiJson(`${prefix}/commits/${source.verifiedCommit}`),
      source.id,
      source.verifiedCommit,
    );
    if (Date.parse(commitDate(verified)) > verifiedAtMs) {
      throw new Error(`${source.id}: verifiedAt predates the verified commit`);
    }

    // Resolve the mutable ref once. Every remaining read is bound to these
    // immutable commit/tree identities, never to timestamps or a moving main.
    const target = requireCommit(
      await apiJson(`${prefix}/commits/${encodeURIComponent(source.ref)}`),
      source.id,
    );
    const comparison = await apiJson(
      `${prefix}/compare/${verified.sha}...${target.sha}?per_page=1`,
    );
    if (
      !['ahead', 'identical'].includes(comparison.status) ||
      comparison.base_commit?.sha !== verified.sha ||
      comparison.merge_base_commit?.sha !== verified.sha ||
      (comparison.status === 'identical') !== (verified.sha === target.sha)
    ) {
      throw new Error(`${source.id}: verified commit is not the pinned target's proven ancestor`);
    }

    const pathResults = [];
    for (const path of source.paths) {
      const before = await pathIdentity(source.repo, verified.commit.tree.sha, path);
      const after = await pathIdentity(source.repo, target.commit.tree.sha, path);
      if (before === null && after === null) {
        throw new Error(`${source.id}: watched path absent from both pinned trees: ${path}`);
      }
      const changed = JSON.stringify(before) !== JSON.stringify(after);
      if (changed) changedPathCount += 1;
      pathResults.push({
        path,
        before,
        after,
        changes: changed ? [{
          sha: target.sha,
          date: commitDate(target),
          summary: 'Watched path identity differs from the verified Git tree',
          url: `https://github.com/${source.repo}/compare/${verified.sha}...${target.sha}`,
        }] : [],
      });
    }
    sourceResults.push({
      id: source.id,
      repo: source.repo,
      ref: source.ref,
      refCommit: target.sha,
      verifiedAt: source.verifiedAt,
      verifiedCommit: verified.sha,
      verifiedCommitDate: commitDate(verified),
      verificationMode: 'git-tree-identity',
      sections: source.sections,
      paths: pathResults,
    });
  }
  await writeReport({
    ok: changedPathCount === 0,
    checkedAt: new Date().toISOString(),
    changedPathCount,
    sources: sourceResults,
  });
  if (changedPathCount > 0) {
    console.error(`Upstream contract drift detected in ${changedPathCount} watched path(s). Review output at ${reportPath}.`);
    process.exitCode = 1;
  } else {
    console.log(`No upstream contract drift across ${sourceResults.length} source(s).`);
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  await writeReport({
    ok: false,
    checkedAt: new Date().toISOString(),
    error: message,
    sources: sourceResults,
  });
  console.error(message);
  process.exitCode = 1;
}

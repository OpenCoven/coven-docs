import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import process from 'node:process';

const baseUrl = new URL(process.env.DOCS_PRODUCTION_URL ?? 'https://docs.opencoven.ai');
const expectedCommit = process.env.EXPECTED_SHA?.trim() || null;
const attempts = parsePositiveInteger(process.env.DOCS_PRODUCTION_ATTEMPTS, 1);
const intervalMs = parsePositiveInteger(process.env.DOCS_PRODUCTION_INTERVAL_MS, 5_000);
const reportPath = resolve(
  process.env.DOCS_REPORT_PATH ?? 'output/docs-production.json',
);
const commitPattern = /^[0-9a-f]{7,64}$/i;

const routes = [
  { path: '/', expected: 'Start a session', html: true },
  { path: '/docs', expected: 'From install to evidence.', html: true },
  {
    path: '/docs/guide/getting-started',
    expected: 'Run a first session',
    html: true,
  },
  {
    path: '/docs/cli/setup',
    expected: 'Optional verification',
    html: true,
  },
  {
    path: '/docs/reference/troubleshooting',
    expected: 'Troubleshooting',
    html: true,
  },
  { path: '/docs/openapi', expected: 'API Reference', html: true },
  { path: '/llms.txt', expected: '# Coven', html: false },
  {
    path: '/sitemap.xml',
    expected: '/docs/guide/getting-started',
    html: false,
  },
];

function parsePositiveInteger(value, fallback) {
  if (value === undefined || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`Expected a positive integer, received ${value}`);
  }
  return parsed;
}

function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

async function fetchText(path) {
  const response = await fetch(new URL(path, baseUrl), {
    cache: 'no-store',
    redirect: 'follow',
    signal: AbortSignal.timeout(15_000),
    headers: {
      'cache-control': 'no-cache',
      'user-agent': 'coven-docs-production-check/1',
    },
  });
  const body = await response.text();
  return { response, body };
}

function parseBuild(body) {
  return Object.fromEntries(
    body
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => {
        const index = line.indexOf('=');
        return index === -1 ? [line, ''] : [line.slice(0, index), line.slice(index + 1)];
      }),
  );
}

async function checkOnce(attempt) {
  const checkedAt = new Date().toISOString();
  const buildResult = await fetchText('/build.txt');
  if (!buildResult.response.ok) {
    throw new Error(`/build.txt returned ${buildResult.response.status}`);
  }

  const build = parseBuild(buildResult.body);
  if (build.product !== 'Coven Docs') {
    throw new Error(`/build.txt reported unexpected product ${build.product ?? '<missing>'}`);
  }
  if (!commitPattern.test(build.commit ?? '')) {
    throw new Error(`/build.txt reported invalid commit ${build.commit ?? '<missing>'}`);
  }
  if (expectedCommit && build.commit !== expectedCommit) {
    throw new Error(`production commit ${build.commit} does not match main ${expectedCommit}`);
  }

  const routeResults = [];
  for (const route of routes) {
    const result = await fetchText(route.path);
    if (!result.response.ok) {
      throw new Error(`${route.path} returned ${result.response.status}`);
    }
    if (!result.body.includes(route.expected)) {
      throw new Error(`${route.path} did not include ${JSON.stringify(route.expected)}`);
    }
    const headerCommit = result.response.headers.get('x-coven-docs-commit');
    if (route.html && headerCommit !== build.commit) {
      throw new Error(
        `${route.path} reported header commit ${headerCommit ?? '<missing>'}; expected ${build.commit}`,
      );
    }
    routeResults.push({
      path: route.path,
      status: result.response.status,
      headerCommit,
    });
  }

  return {
    ok: true,
    checkedAt,
    attempt,
    baseUrl: baseUrl.toString(),
    expectedCommit,
    deployedCommit: build.commit,
    routes: routeResults,
  };
}

async function writeReport(report) {
  await mkdir(dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
}

let lastFailure;
for (let attempt = 1; attempt <= attempts; attempt += 1) {
  try {
    const report = await checkOnce(attempt);
    await writeReport(report);
    console.log(
      `Production docs are live at ${report.deployedCommit}; checked ${report.routes.length} routes.`,
    );
    process.exit(0);
  } catch (error) {
    lastFailure = error instanceof Error ? error.message : String(error);
    console.error(`Production check ${attempt}/${attempts} failed: ${lastFailure}`);
    if (attempt < attempts) await sleep(intervalMs);
  }
}

await writeReport({
  ok: false,
  checkedAt: new Date().toISOString(),
  baseUrl: baseUrl.toString(),
  expectedCommit,
  attempts,
  error: lastFailure ?? 'Unknown production verification failure',
});
process.exit(1);

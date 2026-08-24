import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import puppeteer from 'puppeteer';

const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const port = Number(process.env.DOCS_SMOKE_PORT ?? 4173);
const baseUrl = `http://127.0.0.1:${port}`;
const evidenceDir = resolve(process.env.DOCS_SMOKE_OUTPUT ?? 'output/docs-smoke');
const reportPath = resolve(evidenceDir, 'report.json');
const report = {
  ok: false,
  startedAt: new Date().toISOString(),
  baseUrl,
  buildCommit: null,
  routes: [],
  mobile: [],
  error: null,
};

await mkdir(evidenceDir, { recursive: true });

const server = spawn(pnpm, ['exec', 'next', 'start', '-p', String(port)], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    HOSTNAME: '127.0.0.1',
    PORT: String(port),
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});

let output = '';
server.stdout.on('data', (chunk) => {
  output += chunk.toString();
});
server.stderr.on('data', (chunk) => {
  output += chunk.toString();
});

async function waitForServer() {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(`Next.js exited before smoke tests started:\n${output}`);
    }
    try {
      const response = await fetch(`${baseUrl}/`);
      if (response.ok) return;
    } catch {
      // Retry until the server is listening.
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 250));
  }
  throw new Error(`Timed out waiting for ${baseUrl}:\n${output}`);
}

async function readRoute(path) {
  const response = await fetch(`${baseUrl}${path}`, { redirect: 'follow' });
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`${path} returned ${response.status}`);
  }
  return { response, body };
}

async function assertRoute(path, expectedText) {
  const { body } = await readRoute(path);
  if (!body.includes(expectedText)) {
    throw new Error(`${path} did not include expected text: ${expectedText}`);
  }
}

async function assertRedirect(path, destination) {
  const response = await fetch(`${baseUrl}${path}`, { redirect: 'manual' });
  if (![301, 302, 307, 308].includes(response.status)) {
    throw new Error(`${path} did not redirect; received ${response.status}`);
  }
  const location = response.headers.get('location');
  if (!location?.endsWith(destination)) {
    throw new Error(`${path} redirected to ${location}, expected ${destination}`);
  }
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

async function saveReport() {
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
}

let browser;
try {
  await waitForServer();

  const buildRoute = await readRoute('/build.txt');
  const build = parseBuild(buildRoute.body);
  if (!/^(?:local|[0-9a-f]{7,64})$/i.test(build.commit ?? '')) {
    throw new Error(`/build.txt returned invalid commit ${build.commit ?? '<missing>'}`);
  }
  report.buildCommit = build.commit;

  await assertRoute('/llms.txt', '# Coven');
  await assertRoute('/llms-full.txt', '# Coven — Full Documentation');
  await assertRoute('/robots.txt', 'Sitemap:');
  await assertRoute('/sitemap.xml', '/docs/guide/getting-started');
  await assertRedirect(
    '/docs/guide/agent-filesystem',
    '/docs/experimental/agent-filesystem',
  );

  browser = await puppeteer.launch({
    headless: true,
    args: process.env.CI ? ['--no-sandbox', '--disable-setuid-sandbox'] : [],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000 });

  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  const routes = [
    { path: '/', expectedText: 'Start a session', screenshot: 'home-desktop.png' },
    {
      path: '/docs',
      expectedText: 'From install to evidence.',
      screenshot: 'docs-desktop.png',
      selector: '[data-docs-portal]',
    },
    {
      path: '/docs/guide/getting-started',
      expectedText: 'Run a first session',
      stability: 'stable',
    },
    {
      path: '/docs/cli/setup',
      expectedText: 'Optional verification',
      stability: 'stable',
    },
    { path: '/docs/guide/ecosystem', expectedText: 'Where Coven ends', stability: 'stable' },
    { path: '/docs/reference/api', expectedText: 'Supported flow', stability: 'stable' },
    {
      path: '/docs/reference/troubleshooting',
      expectedText: 'Troubleshooting',
      stability: 'stable',
    },
    { path: '/docs/openapi', expectedText: 'API Reference', stability: 'stable' },
    {
      path: '/docs/memory-models',
      expectedText: 'Memory',
      stability: 'preview',
    },
    {
      path: '/docs/experimental/agent-filesystem',
      expectedText: 'This is experimental',
      stability: 'experimental',
    },
  ];

  for (const route of routes) {
    const response = await page.goto(`${baseUrl}${route.path}`, {
      waitUntil: 'networkidle0',
      timeout: 30_000,
    });
    if (!response?.ok()) {
      throw new Error(`${route.path} failed in Chromium with ${response?.status()}`);
    }

    const headers = response.headers();
    if (headers['x-coven-docs-commit'] !== report.buildCommit) {
      throw new Error(
        `${route.path} reported commit ${headers['x-coven-docs-commit'] ?? '<missing>'}; expected ${report.buildCommit}`,
      );
    }
    if (headers['x-content-type-options'] !== 'nosniff') {
      throw new Error(`${route.path} is missing X-Content-Type-Options: nosniff`);
    }
    if (!headers['referrer-policy']) {
      throw new Error(`${route.path} is missing Referrer-Policy`);
    }
    if (!headers['permissions-policy']) {
      throw new Error(`${route.path} is missing Permissions-Policy`);
    }

    const bodyText = await page.evaluate(() => document.body.innerText);
    if (!bodyText.includes(route.expectedText)) {
      throw new Error(`${route.path} did not render expected text: ${route.expectedText}`);
    }

    const h1Count = await page.$$eval('h1', (elements) => elements.length);
    if (h1Count !== 1) {
      throw new Error(`${route.path} rendered ${h1Count} h1 elements; expected exactly one`);
    }

    const mainCount = await page.$$eval('main', (elements) => elements.length);
    if (mainCount !== 1) {
      throw new Error(`${route.path} rendered ${mainCount} main landmarks; expected exactly one`);
    }

    const missingAlt = await page.$$eval('img:not([alt])', (elements) => elements.length);
    if (missingAlt !== 0) {
      throw new Error(`${route.path} rendered ${missingAlt} image(s) without alt attributes`);
    }

    const canonical = await page
      .$eval('link[rel="canonical"]', (element) => element.getAttribute('href'))
      .catch(() => null);
    if (!canonical) {
      throw new Error(`${route.path} is missing a canonical link`);
    }

    if (route.selector && !(await page.$(route.selector))) {
      throw new Error(`${route.path} is missing required selector ${route.selector}`);
    }

    if (route.stability) {
      const stability = await page
        .$eval('[data-docs-stability]', (element) => element.getAttribute('data-docs-stability'))
        .catch(() => null);
      if (stability !== route.stability) {
        throw new Error(`${route.path} reported stability ${stability}; expected ${route.stability}`);
      }
      const sourceLink = await page.$('.coven-docs-status-source');
      if (!sourceLink) {
        throw new Error(`${route.path} is missing its contract-source link`);
      }
    }

    if (route.screenshot) {
      await page.screenshot({
        path: resolve(evidenceDir, route.screenshot),
        fullPage: true,
      });
    }

    report.routes.push({
      path: route.path,
      status: response.status(),
      canonical,
      stability: route.stability ?? null,
      h1Count,
      mainCount,
    });
  }

  await page.setViewport({ width: 390, height: 844 });
  for (const [path, screenshot] of [
    ['/', 'home-mobile.png'],
    ['/docs', 'docs-mobile.png'],
    ['/docs/guide/getting-started', 'getting-started-mobile.png'],
  ]) {
    await page.goto(`${baseUrl}${path}`, {
      waitUntil: 'networkidle0',
      timeout: 30_000,
    });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    if (overflow) {
      throw new Error(`${path} has horizontal overflow at 390px`);
    }
    await page.screenshot({
      path: resolve(evidenceDir, screenshot),
      fullPage: true,
    });
    report.mobile.push({ path, width: 390, overflow });
  }

  if (pageErrors.length > 0) {
    throw new Error(`Browser page errors:\n- ${pageErrors.join('\n- ')}`);
  }

  report.ok = true;
  console.log(
    `Docs smoke passed for ${report.routes.length} rendered pages plus exports, redirects, and ${report.mobile.length} mobile views.`,
  );
} catch (error) {
  report.error = error instanceof Error ? error.message : String(error);
  throw error;
} finally {
  report.finishedAt = new Date().toISOString();
  await saveReport();
  if (browser) await browser.close();
  server.kill('SIGTERM');
  await new Promise((resolvePromise) => setTimeout(resolvePromise, 250));
  if (server.exitCode === null) server.kill('SIGKILL');
}

import { spawn } from 'node:child_process';
import process from 'node:process';
import puppeteer from 'puppeteer';

const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const port = Number(process.env.DOCS_SMOKE_PORT ?? 4173);
const baseUrl = `http://127.0.0.1:${port}`;
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
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for ${baseUrl}:\n${output}`);
}

async function assertRoute(path, expectedText) {
  const response = await fetch(`${baseUrl}${path}`);
  if (!response.ok) {
    throw new Error(`${path} returned ${response.status}`);
  }
  const body = await response.text();
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

let browser;
try {
  await waitForServer();

  await assertRoute('/llms.txt', '# Coven');
  await assertRoute('/llms-full.txt', '# Coven — Full Documentation');
  await assertRoute('/robots.txt', 'Sitemap:');
  await assertRoute('/build.txt', 'commit=');
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
  await page.setViewport({ width: 1280, height: 900 });

  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  const routes = [
    ['/', 'Start a session'],
    ['/docs', 'First session'],
    ['/docs/guide/getting-started', 'Run a first session'],
    ['/docs/guide/ecosystem', 'Where Coven ends'],
    ['/docs/reference/api', 'Supported flow'],
    ['/docs/reference/troubleshooting', 'Troubleshooting'],
    ['/docs/openapi', 'API Reference'],
    ['/docs/experimental/agent-filesystem', 'This is experimental'],
  ];

  for (const [path, expectedText] of routes) {
    const response = await page.goto(`${baseUrl}${path}`, {
      waitUntil: 'networkidle0',
      timeout: 30_000,
    });
    if (!response?.ok()) {
      throw new Error(`${path} failed in Chromium with ${response?.status()}`);
    }
    if (!response.headers()['x-coven-docs-commit']) {
      throw new Error(`${path} is missing x-coven-docs-commit`);
    }

    const bodyText = await page.evaluate(() => document.body.innerText);
    if (!bodyText.includes(expectedText)) {
      throw new Error(`${path} did not render expected text: ${expectedText}`);
    }

    const h1Count = await page.$$eval('h1', (elements) => elements.length);
    if (h1Count !== 1) {
      throw new Error(`${path} rendered ${h1Count} h1 elements; expected exactly one`);
    }

    const canonical = await page
      .$eval('link[rel="canonical"]', (element) => element.getAttribute('href'))
      .catch(() => null);
    if (!canonical) {
      throw new Error(`${path} is missing a canonical link`);
    }
  }

  await page.setViewport({ width: 390, height: 844 });
  await page.goto(`${baseUrl}/docs/guide/getting-started`, {
    waitUntil: 'networkidle0',
  });
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  if (overflow) {
    throw new Error('Getting started has horizontal overflow at 390px');
  }

  if (pageErrors.length > 0) {
    throw new Error(`Browser page errors:\n- ${pageErrors.join('\n- ')}`);
  }

  console.log(`Docs smoke passed for ${routes.length} rendered pages plus exports and redirects.`);
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
  await new Promise((resolve) => setTimeout(resolve, 250));
  if (server.exitCode === null) server.kill('SIGKILL');
}

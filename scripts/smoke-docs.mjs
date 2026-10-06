import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import puppeteer from 'puppeteer';
import { smokeFonts } from './smoke-fonts.mjs';
import { assertOgRenderLogs, smokeOg } from './smoke-og.mjs';
import { smokePlatforms } from './smoke-platforms.mjs';

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
  navigation: [],
  followOns: [],
  fonts: null,
  ogImages: [],
  journeys: {},
  error: null,
};

const requiredJourneys = ['start', 'troubleshoot', 'reference', 'integration'];

await mkdir(evidenceDir, { recursive: true });

const server = spawn(process.execPath, [resolve('node_modules/next/dist/bin/next'), 'start', '-p', String(port)], {
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

async function assertMarkdownRoute(path, expectedText) {
  const { response, body } = await readRoute(path);
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.startsWith('text/markdown')) {
    throw new Error(`${path} returned ${contentType || 'no content type'}, expected text/markdown`);
  }
  if (!body.startsWith(expectedText)) {
    throw new Error(`${path} did not start with expected text: ${expectedText}`);
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
  // The index must list pages, not just the header: an unawaited async
  // index() once shipped "[object Promise]" here.
  await assertRoute('/llms.txt', '](/docs/guide/getting-started)');
  await assertRoute('/llms-full.txt', '# Coven — Full Documentation');
  await assertMarkdownRoute('/docs.md', '# Coven');
  await assertMarkdownRoute('/docs/guide/getting-started.md', '# Getting started');
  await assertMarkdownRoute('/docs/memory-models/working-memory.md', '# Working Memory');
  // Markdown exports keep every platform block, labelled by its tokens.
  await assertRoute('/docs/cli/install-debugging.md', '<Platform only="windows">');
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
  // A timed-out wait says where the page was: an unchanged URL means a click
  // never navigated, a new URL without the expected heading means the page
  // was slow to render. (Navigation waits have timed out intermittently on
  // busy CI runners; 12 quiet local runs all passed.)
  const waitForFunction = page.waitForFunction.bind(page);
  page.waitForFunction = async (...args) => {
    const started = Date.now();
    try {
      return await waitForFunction(...args);
    } catch (error) {
      const state = await page
        .evaluate(() => ({
          url: location.href,
          h1: document.querySelector('h1')?.textContent ?? null,
          readyState: document.readyState,
          scrollY: Math.round(scrollY),
          width: innerWidth,
        }))
        .catch((evaluateError) => ({ unavailable: evaluateError.message }));
      error.message = `${error.message} after ${Date.now() - started}ms at ${JSON.stringify(state)}`;
      throw error;
    }
  };
  await page.setCacheEnabled(false);
  await page.setViewport({ width: 1440, height: 1000 });

  report.ogImages = await smokeOg(page, baseUrl, evidenceDir);
  assertOgRenderLogs(output);

  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  async function gotoAndReady(path, expectedText) {
    const response = await page.goto(`${baseUrl}${path}`, {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });
    const status = response?.status();
    if (!response || (status !== 304 && !response.ok())) {
      throw new Error(`${path} failed in Chromium with ${status ?? '<no response>'}`);
    }

    await page.waitForFunction(
      (text) => document.body?.innerText.includes(text),
      { timeout: 15_000, polling: 100 },
      expectedText,
    );
    await page.waitForFunction(
      () => document.readyState === 'complete',
      { timeout: 15_000, polling: 100 },
    );
    await page.evaluate(async () => {
      if (document.fonts?.ready) await document.fonts.ready;
    });

    return response;
  }

  const routes = [
    { path: '/', expectedText: 'Choose the harness.', screenshot: 'home-desktop.png' },
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
      journey: 'start',
    },
    {
      path: '/docs/guide/next-steps',
      expectedText: 'Choose your next step',
      stability: 'stable',
      journey: 'start',
      screenshot: 'next-steps-desktop.png',
    },
    {
      path: '/docs/cli/setup',
      expectedText: 'Optional verification',
      stability: 'stable',
    },
    { path: '/docs/guide/ecosystem', expectedText: 'Where Coven ends', stability: 'stable' },
    {
      path: '/docs/reference/api',
      expectedText: 'Supported flow',
      stability: 'stable',
      journey: 'reference',
    },
    {
      path: '/docs/reference/troubleshooting',
      expectedText: 'Troubleshooting',
      stability: 'stable',
      journey: 'troubleshoot',
    },
    {
      path: '/docs/reference/support',
      expectedText: 'Redact before you share',
      stability: 'stable',
      journey: 'troubleshoot',
      screenshot: 'support-desktop.png',
    },
    {
      path: '/docs/harnesses',
      expectedText: 'Built-in harnesses',
      stability: 'stable',
      journey: 'integration',
    },
    {
      path: '/docs/harnesses/codex',
      expectedText: 'project-rooted PTY',
      stability: 'stable',
      journey: 'integration',
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
    const response = await gotoAndReady(route.path, route.expectedText);
    if (route.path === '/') report.fonts = await smokeFonts(page, baseUrl);

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
      journey: route.journey ?? null,
      h1Count,
      mainCount,
    });
  }

  const coveredJourneys = new Set(
    routes.flatMap((route) => (route.journey ? [route.journey] : [])),
  );
  const missingJourneys = requiredJourneys.filter((journey) => !coveredJourneys.has(journey));
  if (missingJourneys.length > 0) {
    throw new Error(
      `Browser smoke is missing required journey routes: ${missingJourneys.join(', ')}`,
    );
  }
  report.journeys = Object.fromEntries(
    requiredJourneys.map((journey) => [
      journey,
      routes.filter((route) => route.journey === journey).map((route) => route.path),
    ]),
  );

  await page.setViewport({ width: 390, height: 844 });
  const mobileRoutes = [
    { path: '/', expectedText: 'Choose the harness.', screenshot: 'home-mobile.png' },
    {
      path: '/docs',
      expectedText: 'From install to evidence.',
      screenshot: 'docs-mobile.png',
    },
    {
      path: '/docs/guide/getting-started',
      expectedText: 'Run a first session',
      screenshot: 'getting-started-mobile.png',
    },
    {
      path: '/docs/guide/next-steps',
      expectedText: 'Choose your next step',
      screenshot: 'next-steps-mobile.png',
    },
    {
      path: '/docs/reference/support',
      expectedText: 'Redact before you share',
      screenshot: 'support-mobile.png',
    },
  ];

  for (const route of mobileRoutes) {
    await gotoAndReady(route.path, route.expectedText);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    if (overflow) {
      throw new Error(`${route.path} has horizontal overflow at 390px`);
    }
    await page.screenshot({
      path: resolve(evidenceDir, route.screenshot),
      fullPage: true,
    });
    report.mobile.push({ path: route.path, width: 390, overflow });
  }

  await page.setViewport({ width: 1440, height: 1000 });
  const followOnLinks = [
    ...[
      ['/docs/guide/install', 'Install Coven'],
      ['/docs/guide/getting-started', 'Getting started'],
      ['/docs/cli/sessions', 'Sessions'],
      ['/docs/reference/troubleshooting', 'Troubleshooting'],
    ].map(([href, title]) => [
      '/docs', 'From install to evidence.', href, title,
      `main section[aria-labelledby="first-session-path"] a[href="${href}"]`,
    ]),
    ['/docs/guide/getting-started', 'Run a first session', '/docs/guide/next-steps', 'Next steps', 'main a#next-steps-entry'],
    ['/docs/reference/troubleshooting', 'Troubleshooting', '/docs/reference/support', 'Support', 'main a#support-entry'],
    ...[
      ['/docs/cli/sessions', 'Sessions'],
      ['/docs/cli', 'CLI Reference'],
      ['/docs/reference/troubleshooting', 'Troubleshooting'],
      ['/docs/cli/interactive', 'Interactive Shell and TUI'],
      ['/docs/reference/api', 'Coven local API'],
      ['/docs/guide/deployments', 'Deployments'],
      ['/docs/reference/support', 'Support'],
    ].map(([href, title]) => [
      '/docs/guide/next-steps', 'Choose your next step', href, title,
      `main #next-step-destinations a[href="${href}"]`,
    ]),
  ];
  for (const [from, text, href, title, selector] of followOnLinks) {
    await gotoAndReady(from, text);
    const matches = await page.$$eval(selector, (links) => links.length);
    if (matches !== 1) throw new Error(`${from}: expected one journey link for ${selector}, found ${matches}`);
    await page.click(selector);
    await page.waitForFunction(
      (path, heading) => location.pathname === path && document.querySelector('h1')?.textContent === heading,
      { timeout: 10_000 },
      href,
      title,
    );
    report.followOns.push({ from, to: href, title, selector });
  }

  for (const width of [320, 390, 768, 1280, 1920]) {
    await page.setViewport({ width, height: 844 });
    await gotoAndReady('/docs/guide/next-steps', 'Choose your next step');
    await page.evaluate(() => history.pushState(history.state, '', '#scroll-regression'));
    await page.goBack({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => location.pathname === '/docs/guide/next-steps' && location.hash === '');

    async function expectPageTop(path, title) {
      await page.waitForFunction(
        (expectedPath, expectedTitle) =>
          location.pathname === expectedPath && document.querySelector('h1')?.textContent === expectedTitle,
        { timeout: 10_000 },
        path,
        title,
      );
      await page.waitForFunction(() => window.scrollY <= 2, { timeout: 3_000 });
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const { scrollY, overflow } = await page.evaluate(() => ({
        scrollY: window.scrollY,
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      }));
      if (overflow) throw new Error(`${path} has horizontal overflow at ${width}px`);
      if (scrollY > 2) throw new Error(`${path} opened at scrollY=${scrollY} at ${width}px`);
    }

    await page.click('nav[aria-label="Page navigation"] a[href="/docs/guide/install"]');
    await expectPageTop('/docs/guide/install', 'Install Coven');

    await page.click('nav[aria-label="Page navigation"] a[href="/docs/guide/next-steps"]');
    await expectPageTop('/docs/guide/next-steps', 'Next steps');

    await page.goBack({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(
      () => location.pathname === '/docs/guide/install' &&
        document.querySelector('h1')?.textContent === 'Install Coven' && window.scrollY > 100,
      { timeout: 10_000 },
    );
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    if (await page.evaluate(() => window.scrollY <= 100)) {
      throw new Error(`Back navigation lost its restored scroll position at ${width}px`);
    }

    await gotoAndReady('/docs/guide/getting-started', 'Run a first session');
    await page.click('a[href="/docs/reference/troubleshooting#daemon-unavailable"]');
    await page.waitForFunction(() => {
      const heading = document.getElementById('daemon-unavailable');
      const top = heading?.getBoundingClientRect().top;
      return location.hash === '#daemon-unavailable' && window.scrollY > 100 &&
        top !== undefined && top >= 0 && top < innerHeight;
    }, { timeout: 10_000 });

    await gotoAndReady('/docs/guide/getting-started', 'Run a first session');
    await page.evaluate(() => window.scrollTo({ top: document.scrollingElement.scrollHeight, behavior: 'instant' }));
    if (width < 768) {
      await page.click('button[aria-label="Open Sidebar"]');
    }
    const sectionButton = `${width < 768 ? '#nd-sidebar-mobile' : '#nd-sidebar'} button[aria-haspopup="dialog"]`;
    await page.waitForFunction(
      (selector) => {
        const rect = document.querySelector(selector)?.getBoundingClientRect();
        return rect && rect.left >= 0 && rect.right <= innerWidth && rect.top >= 0 && rect.bottom <= innerHeight;
      },
      { timeout: 5_000 },
      sectionButton,
    );
    await page.click(sectionButton);
    await page.waitForSelector('[role="dialog"] a[href="/docs/cli"]', { visible: true });
    await page.click('[role="dialog"] a[href="/docs/cli"]');
    await expectPageTop('/docs/cli', 'CLI Reference');

    report.navigation.push({ width, footerNext: true, footerPrevious: true, history: true, heading: true, section: true });
  }

  report.platforms = await smokePlatforms(browser, baseUrl);

  assertOgRenderLogs(output);
  if (pageErrors.length > 0) {
    throw new Error(`Browser page errors:\n- ${pageErrors.join('\n- ')}`);
  }

  report.ok = true;
  console.log(
    `Docs smoke passed for ${report.routes.length} rendered pages covering the ${requiredJourneys.join(', ')} journeys plus exports, redirects, ${report.followOns.length} journey links, ${report.mobile.length} mobile views, ${report.navigation.length} navigation widths, ${report.platforms.length} platform filter states, and ${report.ogImages.length} OG images.`,
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

// Platform filter smoke: the pilot page renders every block on the server,
// and the reader's platform (link, saved choice, or menu pick) hides the rest
// without a hydration error. Each scenario gets a fresh browser context so
// saved choices do not leak between them.

const pilot = '/docs/cli/install-debugging';
const storageKey = 'coven-docs:platform';
// Text that appears only inside one platform's block. The Unix marker spans
// two lines because `echo "$PATH" | tr` alone also appears in shared steps.
const unixOnly = `which -a coven\necho "$PATH"`;
const windowsOnly = `$env:Path -split ';'`;

export async function smokePlatforms(browser, baseUrl) {
  const report = [];

  // Server HTML keeps every platform for search engines, no-JS readers, and print.
  const html = await (await fetch(`${baseUrl}${pilot}`)).text();
  for (const [tokens, count] of [['macos linux', 2], ['windows', 2]]) {
    const found = html.split(`data-platforms="${tokens}"`).length - 1;
    if (found !== count) throw new Error(`${pilot} server HTML has ${found} "${tokens}" blocks, expected ${count}`);
  }
  if (!html.includes('data-platform-source') || !html.includes('@media screen')) {
    throw new Error(`${pilot} server HTML is missing the platform boot script or styles`);
  }

  async function scenario(name, { saved = null, query = '' }, act) {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error' && /hydrat|did not match/i.test(message.text())) errors.push(message.text());
    });
    try {
      await page.setViewport({ width: 1440, height: 1000 });
      await page.evaluateOnNewDocument(
        (key, value) => {
          if (value) localStorage.setItem(key, value);
        },
        storageKey,
        saved,
      );
      await page.goto(`${baseUrl}${pilot}${query}`, { waitUntil: 'networkidle0', timeout: 30_000 });
      if (act) await act(page);
      const state = await page.evaluate(
        (unix, windows, key) => {
          const root = document.documentElement.dataset;
          const text = document.body.innerText;
          return {
            platform: root.platform ?? null,
            os: root.platformOs ?? null,
            source: root.platformSource ?? null,
            saved: localStorage.getItem(key),
            unix: text.includes(unix),
            windows: text.includes(windows),
            notice: document.querySelector('[role="note"]')?.textContent.replace(/\s+/g, ' ').trim() ?? '',
          };
        },
        unixOnly,
        windowsOnly,
        storageKey,
      );
      if (errors.length > 0) throw new Error(`${name}: browser errors:\n- ${errors.join('\n- ')}`);
      report.push({ name, ...state });
      return state;
    } finally {
      await context.close();
    }
  }

  function expect(name, state, expected) {
    for (const [key, value] of Object.entries(expected)) {
      if (state[key] !== value) {
        throw new Error(`Platform smoke "${name}": ${key} was ${JSON.stringify(state[key])}, expected ${JSON.stringify(value)}`);
      }
    }
  }

  expect('saved windows', await scenario('saved windows', { saved: 'windows-x64' }), {
    platform: 'windows-x64',
    source: 'saved',
    windows: true,
    unix: false,
  });

  expect('link beats saved', await scenario('link beats saved', { saved: 'windows-x64', query: '?platform=macos-arm64' }), {
    platform: 'macos-arm64',
    source: 'link',
    windows: false,
    unix: true,
  });

  expect('all platforms', await scenario('all platforms', { saved: 'all' }), {
    platform: null,
    os: null,
    windows: true,
    unix: true,
  });

  const picked = await scenario('menu pick', { saved: 'all' }, async (page) => {
    await page.click('#nd-sidebar button[aria-label^="Platform"]');
    await page.waitForSelector('input[value="linux-x64"]');
    await page.click('label:has(> input[value="linux-x64"])');
    await page.waitForFunction(() => document.documentElement.dataset.platform === 'linux-x64', { timeout: 5_000 });
  });
  expect('menu pick', picked, { platform: 'linux-x64', saved: 'linux-x64', windows: false, unix: true });
  if (!picked.notice.includes('Linux (x64)')) throw new Error(`Platform notice did not follow the pick: ${picked.notice}`);

  const widened = await scenario('show all', { saved: 'windows-x64' }, async (page) => {
    const [button] = await page.$$('xpath/.//div[@role="note"]//button[normalize-space()="Show all"]');
    if (!button) throw new Error('Platform notice has no "Show all" button');
    await button.click();
    await page.waitForFunction(() => !document.documentElement.dataset.platformOs, { timeout: 5_000 });
  });
  expect('show all', widened, { saved: 'all', windows: true, unix: true });

  // A platform matrix highlights the reader's row and hides none.
  const matrixHtml = await (await fetch(`${baseUrl}/docs/guide/platforms`)).text();
  const matrixRows = matrixHtml.split('data-platform-row=').length - 1;
  if (matrixRows !== 4) throw new Error(`/docs/guide/platforms server HTML has ${matrixRows} matrix rows, expected 4`);
  {
    const context = await browser.createBrowserContext();
    try {
      const page = await context.newPage();
      await page.evaluateOnNewDocument((key) => localStorage.setItem(key, 'windows-x64'), storageKey);
      await page.goto(`${baseUrl}/docs/guide/platforms`, { waitUntil: 'networkidle0', timeout: 30_000 });
      const lit = await page.evaluate(() =>
        [...document.querySelectorAll('[data-platform-row]')]
          .filter((row) => getComputedStyle(row).backgroundColor !== 'rgba(0, 0, 0, 0)')
          .map((row) => row.dataset.platformRow.split(' ')[0]),
      );
      if (lit.join() !== 'windows-x64') throw new Error(`Platform matrix highlighted [${lit}], expected [windows-x64]`);
      report.push({ name: 'matrix highlight', highlighted: lit });
    } finally {
      await context.close();
    }
  }

  return report;
}

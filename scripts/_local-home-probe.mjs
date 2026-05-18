import puppeteer from 'puppeteer';

const errors = [];

async function capture(theme, outPath) {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: theme }]);
  page.on('pageerror', (err) => errors.push(`[${theme}] pageerror: ${err.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`[${theme}] console.error: ${msg.text()}`);
  });

  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
  await page.evaluate((t) => {
    localStorage.setItem('theme', t);
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.classList.add(t);
  }, theme);
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle0', timeout: 90000 });
  // wait for client hydration (next-themes flicker etc.)
  await new Promise((r) => setTimeout(r, 600));

  const probe = await page.evaluate(() => {
    const html = document.documentElement;
    const body = document.body;
    const homeMain = document.querySelector('[class*="homeMain"]');
    const heroTitle = document.querySelector('[class*="heroTitle"]');
    return {
      htmlClass: html.className,
      bodyBg: getComputedStyle(body).backgroundColor,
      bodyFg: getComputedStyle(body).color,
      homeMainBg: homeMain ? getComputedStyle(homeMain).backgroundColor : null,
      homeMainColor: homeMain ? getComputedStyle(homeMain).color : null,
      heroTitleColor: heroTitle ? getComputedStyle(heroTitle).color : null,
      tokens: homeMain ? {
        surface: getComputedStyle(homeMain).getPropertyValue('--home-surface').trim(),
        fg: getComputedStyle(homeMain).getPropertyValue('--home-fg').trim(),
        fgStrong: getComputedStyle(homeMain).getPropertyValue('--home-fg-strong').trim(),
        violet: getComputedStyle(homeMain).getPropertyValue('--home-violet').trim(),
        violetText: getComputedStyle(homeMain).getPropertyValue('--home-violet-text').trim(),
      } : null,
    };
  });
  console.log(`[${theme}]`, JSON.stringify(probe, null, 2));

  await page.screenshot({ path: outPath, fullPage: true });
  await browser.close();
}

await capture('dark', '/tmp/home-after-dark.png');
await capture('light', '/tmp/home-after-light.png');

if (errors.length) {
  console.error('--- runtime errors ---');
  for (const e of errors) console.error(e);
  process.exit(1);
}
console.log('no runtime errors');

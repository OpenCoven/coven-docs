import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({ headless: 'new' });
const page = await browser.newPage();

async function probe(theme) {
  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
  await page.evaluate((t) => {
    localStorage.setItem('theme', t);
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.classList.add(t);
  }, theme);
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle0' });
  return await page.evaluate(() => {
    const cs = getComputedStyle(document.documentElement);
    const interesting = [
      '--background', '--foreground', '--card', '--card-foreground',
      '--muted', '--muted-foreground', '--border', '--popover',
      '--secondary', '--accent', '--primary',
      '--color-fd-background', '--color-fd-foreground', '--color-fd-card',
      '--color-fd-muted', '--color-fd-muted-foreground', '--color-fd-border',
      '--color-fd-popover', '--color-fd-secondary', '--color-fd-accent',
      '--color-fd-primary', '--color-fd-primary-foreground',
      '--coven-violet', '--coven-violet-light',
    ];
    return Object.fromEntries(interesting.map((k) => [k, cs.getPropertyValue(k).trim()]));
  });
}

console.log('dark:', await probe('dark'));
console.log('light:', await probe('light'));
await browser.close();

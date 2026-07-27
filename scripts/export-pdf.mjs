import fs from 'node:fs/promises';
import path from 'node:path';
import puppeteer from 'puppeteer';

const origin = process.env.DOCS_ORIGIN ?? 'http://localhost:3000';
const outDir = process.env.DOCS_PDF_DIR ?? 'pdfs';
const routes = (
  process.env.DOCS_PDF_ROUTES ??
  '/docs,/docs/guide/getting-started,/docs/guide/install,/docs/guide/concepts,/docs/guide/architecture,/docs/cli,/docs/harnesses,/docs/daemon,/docs/memory-models,/docs/reference/api,/docs/reference/auth,/docs/reference/safety,/docs/reference/troubleshooting'
)
  .split(',')
  .map((route) => route.trim())
  .filter(Boolean);

function fileNameForRoute(route) {
  if (route === '/docs') return 'docs.pdf';
  return `${route.slice(1).replaceAll('/', '-')}.pdf`;
}

await fs.mkdir(outDir, { recursive: true });

const browser = await puppeteer.launch({
  headless: true,
});

try {
  for (const route of routes) {
    const page = await browser.newPage();
    await page.goto(new URL(route, origin).toString(), {
      waitUntil: 'networkidle2',
    });

    await page.pdf({
      path: path.join(outDir, fileNameForRoute(route)),
      width: 950,
      printBackground: true,
    });

    console.log(`PDF generated for ${route}`);
    await page.close();
  }
} finally {
  await browser.close();
}

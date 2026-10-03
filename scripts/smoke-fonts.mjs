import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const manifest = JSON.parse(await readFile(new URL('../app/fonts/manifest.json', import.meta.url), 'utf8'));
const samples = [
  { kind: 'body', family: 'inter', style: 'normal', stack: 'inherit' },
  { kind: 'display', family: 'eb-garamond', style: 'normal', stack: 'var(--oc-font-display)' },
  { kind: 'italic', family: 'eb-garamond', style: 'italic', stack: 'var(--oc-font-display)' },
  { kind: 'code', family: 'jetbrains-mono', style: 'normal', stack: 'var(--oc-font-mono)' },
];

export async function smokeFonts(page, baseUrl) {
  const assets = new Map();
  async function identifyAsset(url) {
    if (assets.has(url)) return assets.get(url);
    if (new URL(url).origin !== new URL(baseUrl).origin) throw new Error(`Font is not self-hosted: ${url}`);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Font returned ${response.status}: ${url}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    const source = manifest.files.find((font) => font.sha256 === sha256);
    if (!source || source.bytes !== bytes.length) throw new Error(`Unrecognized font bytes: ${url}`);
    const result = { url, file: source.file, family: source.family, style: source.style, subset: source.subset, bytes: bytes.length };
    assets.set(url, result);
    return result;
  }

  try {
    const rendered = await page.evaluate(async (definitions) => {
      const probe = document.createElement('div');
      probe.id = 'docs-font-smoke';
      probe.setAttribute('aria-hidden', 'true');
      probe.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none';
      for (const definition of definitions) {
        const sample = document.createElement('span');
        sample.dataset.kind = definition.kind;
        sample.style.fontFamily = definition.stack;
        sample.style.fontStyle = definition.style;
        sample.style.fontWeight = '400';
        sample.textContent = 'Coven';
        probe.append(sample);
      }
      document.body.append(probe);
      await new Promise(requestAnimationFrame);
      await document.fonts.ready;

      const unquote = (value) => value.replace(/^["']|["']$/g, '').trim();
      const faces = [...document.styleSheets].flatMap((sheet) =>
        [...sheet.cssRules]
          .filter((rule) => rule.type === CSSRule.FONT_FACE_RULE)
          .map((rule) => ({ rule, base: sheet.href ?? location.href })),
      );
      return [...probe.children].map((sample) => {
        const computed = getComputedStyle(sample);
        const primaryFamily = unquote(computed.fontFamily.split(',')[0]);
        const face = faces.find(({ rule }) =>
          unquote(rule.style.fontFamily).toLowerCase() === primaryFamily.toLowerCase()
          && (rule.style.fontStyle || 'normal') === computed.fontStyle,
        );
        const url = face?.rule.style.src.match(/url\(["']?([^"')]+)["']?\)/)?.[1];
        if (!url) throw new Error(`No bundled primary font face for ${sample.dataset.kind}`);
        return { kind: sample.dataset.kind, primaryFamily, url: new URL(url, face.base).href };
      });
    }, samples);

    for (const renderedFace of rendered) {
      const font = await identifyAsset(renderedFace.url);
      const expected = samples.find((sample) => sample.kind === renderedFace.kind);
      if (font.family !== expected.family || font.style !== expected.style || font.subset !== 'latin') {
        throw new Error(`${renderedFace.kind} rendered the wrong primary font: ${font.file}`);
      }
    }

    const preloads = await page.$$eval('link[rel="preload"][as="font"]', (links) => links.map((link) => link.href));
    const latin = await Promise.all(preloads.map(identifyAsset));
    if (latin.length !== 4 || new Set(latin.map((font) => font.file)).size !== 4 || latin.some((font) => font.subset !== 'latin')) {
      throw new Error('Expected exactly four distinct Latin font preloads');
    }

    await page.evaluate(async () => {
      for (const sample of document.getElementById('docs-font-smoke').children) sample.textContent += ' Ж Ω Đ';
      await new Promise(requestAnimationFrame);
      await document.fonts.ready;
    });
    const requested = await page.evaluate(() => [...new Set(
      performance.getEntriesByType('resource').map((entry) => entry.name).filter((url) => new URL(url).pathname.endsWith('.woff2')),
    )]);
    const fonts = await Promise.all(requested.map(identifyAsset));
    const expected = manifest.files.filter((font) => ['latin', 'latin-ext', 'greek', 'cyrillic'].includes(font.subset));
    if (fonts.length !== expected.length || expected.some((font) => !fonts.some((loaded) => loaded.file === font.file))) {
      throw new Error('Extended characters did not load exactly their required font subsets');
    }
    return { rendered, latinBytes: latin.reduce((sum, font) => sum + font.bytes, 0), preloads: latin, requested: fonts };
  } finally {
    await page.evaluate(() => document.getElementById('docs-font-smoke')?.remove());
  }
}

import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const cases = [
  ['default', {}],
  ['short', { title: 'Runtime authority', section: 'API Reference' }],
  ['long', { title: 'Run a first session, inspect its evidence, and recover safely', section: 'Guides' }],
  ['escaped', { title: 'Coven <API> & "quoted" café', section: 'CLI & SDK' }],
];

export async function smokeOg(page, baseUrl, evidenceDir) {
  const results = [];
  for (const [name, params] of cases) {
    const path = `/api/og?${new URLSearchParams(params)}`;
    const response = await fetch(`${baseUrl}${path}`, {
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok || response.headers.get('content-type')?.split(';')[0] !== 'image/png') {
      throw new Error(`${path} did not return a successful PNG response: ${response.status}`);
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    const dimensions = await page.evaluate(async (data) => {
      const image = new Image();
      image.src = `data:image/png;base64,${data}`;
      await image.decode();
      return { width: image.naturalWidth, height: image.naturalHeight };
    }, bytes.toString('base64'));
    if (dimensions.width !== 1200 || dimensions.height !== 630) {
      throw new Error(`${path} rendered ${dimensions.width}×${dimensions.height}; expected 1200×630`);
    }
    const file = `og-${name}.png`;
    await writeFile(resolve(evidenceDir, file), bytes);
    results.push({ path, file, ...dimensions, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
  }
  return results;
}

export function assertOgRenderLogs(output) {
  const warnings = [...new Set(output.split('\n').filter((line) =>
    /Failed to load dynamic font|Invalid value .* for /.test(line),
  ))];
  if (warnings.length > 0) {
    throw new Error(`OG renderer reported missing glyphs or unsupported styles:\n${warnings.join('\n')}`);
  }
}

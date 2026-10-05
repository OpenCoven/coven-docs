import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

// The site shows one logo: public/opencoven-logo.svg, a byte-for-byte copy of
// OpenCoven/coven assets/opencoven/opencoven.svg. The favicon is the same file,
// and the edge OG route draws it from lib/opencoven-logo.ts. Keep all three in
// step when the brand refreshes the logo.
const root = resolve(import.meta.dirname, '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');

test('favicon is the approved logo file', () => {
  assert.equal(read('public/favicon.svg'), read('public/opencoven-logo.svg'));
});

test('the OG route draws the same mark as the logo file', () => {
  const svg = read('public/opencoven-logo.svg');
  const lib = read('lib/opencoven-logo.ts');
  const svgPath = svg.match(/<path id="mark"[^>]*\sd="([^"]+)"/)?.[1].trim();
  const libPath = lib.match(/OPENCOVEN_LOGO_PATH =\s*'([^']+)'/)?.[1];
  const svgSize = svg.match(/viewBox="0 0 (\d+) \1"/)?.[1];
  const libSize = lib.match(/OPENCOVEN_LOGO_SIZE = (\d+);/)?.[1];
  assert.ok(svgPath && libPath, 'both sources declare the mark path');
  assert.equal(libPath, svgPath);
  assert.equal(libSize, svgSize);
  assert.match(svg, /<rect id="background"[^>]*fill="#000000"/, 'the approved logo keeps its black square');
});

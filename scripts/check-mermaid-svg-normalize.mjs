import assert from 'node:assert/strict';

import { normalizeMermaidSvg } from '../lib/mermaid-svg.js';

const fixture = [
  '<svg id="diagram" width="640" height="320" viewBox="0 0 640 320">',
  '  <defs>',
  '    <marker id="arrow" markerWidth="20" markerHeight="14" refX="18" refY="7">',
  '      <path d="M 19,7 L11,14 L13,7 L11,0 Z" />',
  '    </marker>',
  '  </defs>',
  '  <g class="node statediagram-state">',
  '    <rect class="basic" x="12" y="24" width="128" height="48" />',
  '    <foreignObject x="12" y="24" width="128" height="48">',
  '      <div class="nodeLabel">running</div>',
  '    </foreignObject>',
  '  </g>',
  '</svg>',
].join('');

const normalized = normalizeMermaidSvg(fixture);

assert.match(
  normalized,
  /^<svg id="diagram" viewBox="0 0 640 320" style="width:100%;height:auto;display:block;">/,
  'normalizer should remove only root dimensions and add responsive root styling',
);
assert.match(normalized, /markerWidth="20"/, 'marker dimensions must remain intact');
assert.match(normalized, /markerHeight="14"/, 'marker dimensions must remain intact');
assert.match(normalized, /<rect class="basic" x="12" y="24" width="128" height="48"/, 'node dimensions must remain intact');
assert.match(normalized, /<foreignObject x="12" y="24" width="128" height="48"/, 'label dimensions must remain intact');

console.log('Mermaid SVG normalization keeps internal dimensions.');

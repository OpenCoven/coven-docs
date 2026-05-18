import fs from 'node:fs';
const source = fs.readFileSync('components/mermaid.tsx', 'utf8');

const requiredSnippets = [
  "import mermaidPackage from 'mermaid/package.json';",
  'MERMAID_RENDERER_LABEL',
  "'Mermaid v' + mermaidPackage.version",
  'mermaid-meta',
  'Copy Mermaid source',
  'Copy SVG',
];

const missing = requiredSnippets.filter((snippet) => !source.includes(snippet));

if (missing.length > 0) {
  console.error(`Mermaid preview UI is missing: ${missing.join(', ')}`);
  process.exit(1);
}

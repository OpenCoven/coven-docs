// Validate every Mermaid diagram in the docs by running it through Mermaid's
// own parser — the same parser the browser uses at render time.
//
// The existing check-mermaid-transform test only proves the remark transform
// wraps fenced blocks in <Mermaid />; it does NOT catch invalid diagram syntax
// (e.g. backticks in a node label), which fails silently at build and only
// errors when the client renders it. This check closes that gap.
//
// Mermaid's parse() runs in Node, but its post-parse sanitize step needs a DOM,
// so we install a minimal jsdom global before importing mermaid. No browser
// download required, unlike a puppeteer-based check.

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const ROOT = path.resolve(fileURLToPath(import.meta.url), '..', '..');
const DOCS_DIR = path.join(ROOT, 'content', 'docs');

// Minimal DOM so Mermaid's DOMPurify-based sanitizer initializes.
const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  pretendToBeVisual: true,
});
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.navigator ??= dom.window.navigator;

const { default: mermaid } = await import('mermaid');
mermaid.initialize({ startOnLoad: false });

async function walk(dir) {
  const out = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else if (entry.isFile() && entry.name.endsWith('.mdx')) out.push(full);
  }
  return out;
}

function lineAt(source, index) {
  return source.slice(0, index).split('\n').length;
}

// Cook a `<Mermaid chart={`...`} />` template literal into the string Mermaid
// actually receives at runtime (escape sequences like \n resolved). Returns
// null for dynamic templates (${...}) we cannot evaluate statically.
function cookTemplate(inner) {
  if (inner.includes('${')) return null;
  // Trusted local docs content, evaluated at build time only.
  // eslint-disable-next-line no-new-func
  return Function('return `' + inner + '`')();
}

// Extract every diagram from a file, tagged with the form that determines how
// the text reaches Mermaid.
function extractDiagrams(source) {
  const diagrams = [];

  const fenced = /```mermaid\r?\n([\s\S]*?)```/g;
  for (let m; (m = fenced.exec(source)); ) {
    // Fenced blocks reach Mermaid verbatim (via JSON.stringify roundtrip).
    diagrams.push({ text: m[1], line: lineAt(source, m.index), form: 'fenced' });
  }

  const component = /<Mermaid\s+chart=\{`([\s\S]*?)`\}/g;
  for (let m; (m = component.exec(source)); ) {
    const cooked = cookTemplate(m[1]);
    diagrams.push({
      text: cooked,
      line: lineAt(source, m.index),
      form: 'component',
      dynamic: cooked === null,
    });
  }

  return diagrams;
}

const files = (await walk(DOCS_DIR)).sort();
const failures = [];
let checked = 0;
let skipped = 0;

for (const file of files) {
  const source = await fs.readFile(file, 'utf8');
  const rel = path.relative(ROOT, file);
  for (const diagram of extractDiagrams(source)) {
    if (diagram.dynamic) {
      skipped++;
      continue;
    }
    checked++;
    try {
      await mermaid.parse(diagram.text);
    } catch (error) {
      const message = String(error?.message ?? error).split('\n')[0];
      const firstLine = diagram.text.trim().split('\n')[0];
      failures.push({ rel, line: diagram.line, form: diagram.form, firstLine, message });
    }
  }
}

if (failures.length > 0) {
  console.error(`Mermaid parse check failed: ${failures.length} invalid diagram(s).\n`);
  for (const f of failures) {
    console.error(`  ${f.rel}:${f.line} (${f.form})`);
    console.error(`    diagram: ${f.firstLine}`);
    console.error(`    error:   ${f.message}\n`);
  }
  process.exit(1);
}

const skippedNote = skipped > 0 ? ` (${skipped} dynamic diagram(s) skipped)` : '';
console.log(`Mermaid parse check passed: ${checked} diagram(s) valid${skippedNote}.`);

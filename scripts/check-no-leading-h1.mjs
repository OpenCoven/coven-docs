import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const docsRoot = path.join(root, 'content/docs');

function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, acc);
    else if (entry.name.endsWith('.mdx')) acc.push(p);
  }
  return acc;
}

function firstContentLine(body) {
  for (const line of body.split('\n')) {
    const t = line.trim();
    if (!t) continue;
    if (t.startsWith('import ') || t.startsWith('export ')) continue;
    return t;
  }
  return '';
}

const violations = [];
for (const file of walk(docsRoot)) {
  const txt = fs.readFileSync(file, 'utf8');
  const m = txt.match(/^(---\n[\s\S]*?\n---\n)([\s\S]*)$/);
  if (!m) continue;
  const fm = m[1];
  const body = m[2];
  if (!/^title:\s*/m.test(fm)) continue;

  const first = firstContentLine(body);
  if (/^#\s+\S/.test(first)) {
    violations.push({ file: path.relative(root, file), line: first });
  }
}

if (violations.length > 0) {
  const lines = violations.map(v => `  ${v.file}: ${v.line}`).join('\n');
  throw new Error(
    `MDX pages with a frontmatter title must not start the body with a # heading ` +
    `(Fumadocs already renders the title as the page H1). Found ${violations.length}:\n${lines}`
  );
}

console.log(`No leading H1 in ${walk(docsRoot).length} MDX docs.`);

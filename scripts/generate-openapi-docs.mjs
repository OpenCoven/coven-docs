#!/usr/bin/env node
// Reads openapi/coven.daemon.v1.built.yaml and emits one MDX file per
// operation under content/docs/openapi/<tag>/<operation>.mdx, plus per-tag
// and top-level meta.json files for fumadocs page-tree ordering.
//
// Each generated MDX file references <APIPage document="..." operations=[...] />
// — fumadocs-openapi resolves the operation from the built spec at render
// time. The `_openapi.method` frontmatter is consumed by openapi.loaderPlugin()
// to decorate the sidebar with method labels.

import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

const ROOT = process.cwd();
const BUILT = path.join(ROOT, 'openapi/coven.daemon.v1.built.yaml');
const OUT = path.join(ROOT, 'content/docs/openapi');
const DOCUMENT_ID = './openapi/coven.daemon.v1.built.yaml';

const GENERATED_HEADER =
  '{/* THIS FILE IS GENERATED — DO NOT EDIT.\n' +
  '    Source:    openapi/coven.daemon.v1.yaml\n' +
  '    Generator: scripts/generate-openapi-docs.mjs\n' +
  '    Run:       pnpm run openapi:build */}\n';

const TAGS = [
  { name: 'Meta',     slug: 'meta',     title: 'Meta',     description: 'Handshake and capability discovery. Always call `/health` first.' },
  { name: 'Sessions', slug: 'sessions', title: 'Sessions', description: 'Launch, inspect, and control harness sessions.' },
  { name: 'Events',   slug: 'events',   title: 'Events',   description: 'Append-only event log for a single session.' },
  { name: 'Actions',  slug: 'actions',  title: 'Actions',  description: 'Control-plane action router.' },
];

const doc = yaml.load(fs.readFileSync(BUILT, 'utf8'));
const METHODS = ['get', 'post', 'put', 'patch', 'delete'];

function kebab(s) {
  return s
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[_\s]+/g, '-')
    .toLowerCase();
}

function frontmatter(obj) {
  return '---\n' + yaml.dump(obj, { lineWidth: -1 }) + '---\n';
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function writeFile(absPath, contents) {
  ensureDir(path.dirname(absPath));
  fs.writeFileSync(absPath, contents);
}

const pagesByTag = new Map(TAGS.map((t) => [t.name, []]));

for (const [pathTemplate, item] of Object.entries(doc.paths ?? {})) {
  for (const methodLower of METHODS) {
    const op = item[methodLower];
    if (!op) continue;
    const tagName = op.tags?.[0] ?? 'Meta';
    if (!pagesByTag.has(tagName)) {
      throw new Error(`Operation ${op.operationId} uses unknown tag "${tagName}"`);
    }
    const slug = kebab(op.operationId);
    pagesByTag.get(tagName).push({ slug, op, pathTemplate, methodLower });
  }
}

// Clean previously-generated tag dirs so removed ops don't linger.
for (const tag of TAGS) {
  const dir = path.join(OUT, tag.slug);
  if (fs.existsSync(dir)) {
    for (const entry of fs.readdirSync(dir)) {
      fs.unlinkSync(path.join(dir, entry));
    }
  }
}

let written = 0;
for (const tag of TAGS) {
  const pages = pagesByTag.get(tag.name) ?? [];
  if (pages.length === 0) continue;
  const tagDir = path.join(OUT, tag.slug);
  ensureDir(tagDir);

  for (const { slug, op, pathTemplate, methodLower } of pages) {
    const body =
      frontmatter({
        title: op.summary ?? op.operationId,
        _openapi: { method: methodLower.toUpperCase() },
      }) +
      '\n' +
      GENERATED_HEADER +
      '\n' +
      // showTitle={false} — DocsPage already renders the frontmatter title as
      // the page H1, so we suppress APIPage's own title to avoid the duplicate
      // H1 problem (see scripts/check-no-leading-h1.mjs). We deliberately do
      // NOT emit a frontmatter `description`: APIPage renders the full spec
      // description (showDescription defaults to true) below the title, and
      // duplicating it (or its first paragraph) in the frontmatter would
      // surface the same text twice on the rendered page.
      `<APIPage\n` +
      `  document={${JSON.stringify(DOCUMENT_ID)}}\n` +
      `  operations={[{ path: ${JSON.stringify(pathTemplate)}, method: ${JSON.stringify(methodLower)} }]}\n` +
      `  showTitle={false}\n` +
      `/>\n`;
    writeFile(path.join(tagDir, `${slug}.mdx`), body);
    written += 1;
  }

  writeFile(
    path.join(tagDir, 'meta.json'),
    JSON.stringify(
      { title: tag.title, description: tag.description, pages: pages.map((p) => p.slug) },
      null,
      2,
    ) + '\n',
  );
}

console.log(`✓ wrote ${written} endpoint pages under ${path.relative(ROOT, OUT)}/`);
for (const tag of TAGS) {
  const count = (pagesByTag.get(tag.name) ?? []).length;
  if (count > 0) console.log(`  - ${tag.slug}/  (${count} pages)`);
}

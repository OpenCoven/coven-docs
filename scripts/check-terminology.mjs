import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const root = process.cwd();
const docsRoot = join(root, 'content', 'docs');
const rulePagePath = join(docsRoot, 'reference', 'harness-vs-runtime.mdx');

// Ambiguous or conflating collocations retired by the harness/runtime
// terminology audit (see /docs/reference/harness-vs-runtime). Each pattern
// welds the substrate sense and the agent sense together, or conflates a
// harness with its provider. Qualified phrasings ("agent runtime",
// "local runtime substrate", "local model runtime") remain allowed.
const bannedCollocations = [
  'harness runtime',
  'runtime harness',
  'coding runtimes',
  'providers as harnesses',
];

// The rule page quotes the banned collocations as examples; the OpenAPI
// pages are generated from openapi/coven.daemon.v1.yaml and never hand-edited.
const exemptPrefixes = [join('reference', 'harness-vs-runtime.mdx'), join('openapi', '')];

// Qualifier phrases the rule page must keep teaching.
const requiredRulePageMentions = [
  'local runtime substrate',
  'agent runtime',
  'local model runtime',
  'runtime_unavailable',
  'harness runtime',
  '/docs/harnesses/what-is-a-harness',
  '/docs/reference/glossolalia',
];

function fail(message) {
  console.error(`Terminology check failed: ${message}`);
  process.exit(1);
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    fail(`could not read JSON at ${path}: ${error.message}`);
  }
}

if (!existsSync(rulePagePath)) {
  fail('missing rule page: content/docs/reference/harness-vs-runtime.mdx.');
}

const rulePage = readFileSync(rulePagePath, 'utf8');

if (!rulePage.includes('read_when:')) {
  fail('content/docs/reference/harness-vs-runtime.mdx is missing read_when frontmatter.');
}

const missingMentions = requiredRulePageMentions.filter((mention) => !rulePage.includes(mention));
if (missingMentions.length > 0) {
  fail(`rule page is missing required mentions: ${missingMentions.join(', ')}.`);
}

const referenceMeta = readJson(join(docsRoot, 'reference', 'meta.json'));
if (!Array.isArray(referenceMeta.pages) || !referenceMeta.pages.includes('harness-vs-runtime')) {
  fail('content/docs/reference/meta.json must list the "harness-vs-runtime" page.');
}

function collectFiles(dir, extensions) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      files.push(...collectFiles(path, extensions));
    } else if (extensions.some((extension) => entry.endsWith(extension))) {
      files.push(path);
    }
  }
  return files;
}

const scanTargets = [
  ...collectFiles(docsRoot, ['.mdx', '.json']),
  ...collectFiles(join(root, 'app'), ['.tsx', '.ts']),
];

const violations = [];
for (const file of scanTargets) {
  const relToDocs = relative(docsRoot, file);
  if (!relToDocs.startsWith('..') && exemptPrefixes.some((prefix) => relToDocs.startsWith(prefix))) {
    continue;
  }

  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, index) => {
    const lowered = line.toLowerCase();
    for (const banned of bannedCollocations) {
      if (lowered.includes(banned)) {
        violations.push(`${relative(root, file).split(sep).join('/')}:${index + 1} contains "${banned}"`);
      }
    }
  });
}

if (violations.length > 0) {
  fail(
    `banned harness/runtime collocations found (see /docs/reference/harness-vs-runtime):\n  ${violations.join('\n  ')}`,
  );
}

console.log('Terminology check passed.');

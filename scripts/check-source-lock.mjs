import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const lock = JSON.parse(
  readFileSync(resolve(root, 'docs/source-lock.json'), 'utf8'),
);
const manifest = JSON.parse(
  readFileSync(resolve(root, 'docs/site-manifest.json'), 'utf8'),
);
const failures = [];
const sectionSlugs = new Set(
  Array.isArray(manifest.sections)
    ? manifest.sections.map((section) => section?.slug).filter(Boolean)
    : [],
);

function fail(message) {
  failures.push(message);
}

if (lock.schemaVersion !== 1) {
  fail('schemaVersion must be 1');
}
if (!Array.isArray(lock.sources) || lock.sources.length === 0) {
  fail('sources must be a non-empty array');
}

const ids = new Set();
for (const [index, source] of (lock.sources ?? []).entries()) {
  const label = source?.id ?? `sources[${index}]`;
  if (!source || typeof source !== 'object') {
    fail(`sources[${index}] must be an object`);
    continue;
  }
  if (typeof source.id !== 'string' || !/^[a-z0-9-]+$/.test(source.id)) {
    fail(`${label}.id must use lowercase letters, digits, and hyphens`);
  } else if (ids.has(source.id)) {
    fail(`${label}.id is duplicated`);
  } else {
    ids.add(source.id);
  }
  if (typeof source.repo !== 'string' || !/^[^/]+\/[^/]+$/.test(source.repo)) {
    fail(`${label}.repo must use owner/repository form`);
  }
  if (typeof source.ref !== 'string' || source.ref.length === 0) {
    fail(`${label}.ref must be a non-empty string`);
  }
  if (
    typeof source.verifiedCommit !== 'string' ||
    !/^[0-9a-f]{40}$/i.test(source.verifiedCommit)
  ) {
    fail(`${label}.verifiedCommit must be a full 40-character Git SHA`);
  }
  if (
    typeof source.verifiedAt !== 'string' ||
    Number.isNaN(Date.parse(source.verifiedAt))
  ) {
    fail(`${label}.verifiedAt must be an ISO-8601 timestamp`);
  }
  if (
    !Array.isArray(source.paths) ||
    source.paths.length === 0 ||
    source.paths.some((path) => typeof path !== 'string' || path.length === 0)
  ) {
    fail(`${label}.paths must be a non-empty array of repository paths`);
  } else if (new Set(source.paths).size !== source.paths.length) {
    fail(`${label}.paths contains duplicates`);
  }
  if (
    !Array.isArray(source.sections) ||
    source.sections.length === 0 ||
    source.sections.some((section) => !sectionSlugs.has(section))
  ) {
    fail(`${label}.sections must contain known docs/site-manifest.json section slugs`);
  }
}

if (failures.length > 0) {
  console.error(`Source-lock check failed:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}

console.log(`Source-lock check passed for ${lock.sources.length} upstream contract source(s).`);

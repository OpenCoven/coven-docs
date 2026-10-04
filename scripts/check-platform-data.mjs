// Offline check for content/data/platforms.json: its shape and provenance,
// and that the docs pages listing native packages and Coven Code archives
// name exactly what upstream ships. Upstream bytes are compared by
// scripts/capture-platform-data.mjs, which needs the network.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pagePath } from './docs-nav.mjs';
import { PLATFORM_DATA_PATH, validatePlatformData } from './platform-data.mjs';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');

const data = JSON.parse(read(PLATFORM_DATA_PATH));
const failures = validatePlatformData(data, JSON.parse(read('docs/source-lock.json')));

function sameNames(label, found, expected) {
  const missing = [...expected].filter((name) => !found.has(name));
  const extra = [...found].filter((name) => !expected.has(name));
  if (missing.length > 0) failures.push(`${label} is missing ${missing.join(', ')}`);
  if (extra.length > 0) failures.push(`${label} names ${extra.join(', ')}, which upstream does not ship`);
}

if (failures.length === 0) {
  const cliPlatforms = data.platforms.filter(({ cli }) => cli !== null);
  const enginePlatforms = data.platforms.filter(({ covenCode }) => covenCode !== null);

  const debuggingFile = pagePath(resolve(root, 'content/docs/cli'), 'install-debugging');
  const debugging = readFileSync(debuggingFile, 'utf8');
  const debuggingLabel = 'content/docs/cli/install-debugging.mdx';
  sameNames(
    `${debuggingLabel} native packages`,
    new Set(debugging.match(/@opencoven\/cli-[a-z0-9-]+/g) ?? []),
    new Set(cliPlatforms.map(({ cli }) => cli.package)),
  );
  const tableRows = debugging.split('\n').filter((line) => line.trimStart().startsWith('|'));
  for (const { cli } of cliPlatforms) {
    if (!tableRows.some((row) => row.includes(`\`${cli.node}\``) && row.includes(`\`${cli.package}\``))) {
      failures.push(`${debuggingLabel} needs a table row pairing \`${cli.node}\` with \`${cli.package}\``);
    }
    if (!debugging.includes(`npm view ${cli.package} version`)) {
      failures.push(`${debuggingLabel} needs \`npm view ${cli.package} version\` in its published-package check`);
    }
  }

  const codeInstallLabel = 'content/docs/coven-code/install.mdx';
  sameNames(
    `${codeInstallLabel} release archives`,
    new Set(read(codeInstallLabel).match(/coven-code-[a-z]+-[a-z0-9_]+\.(?:tar\.gz|zip)/g) ?? []),
    new Set(enginePlatforms.map(({ covenCode }) => covenCode.archive)),
  );
}

if (failures.length > 0) {
  console.error(`Platform data check failed:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}

console.log(
  `Platform data check passed for ${data.platforms.length} platforms at ${data.provenance.verifiedCommit.slice(0, 7)}.`,
);

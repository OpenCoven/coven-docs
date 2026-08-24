import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const scripts = readdirSync(resolve(root, 'scripts'))
  .filter((name) => name.endsWith('.mjs'))
  .map((name) => `scripts/${name}`)
  .sort();
const files = ['next.config.mjs', ...scripts];
const failures = [];

for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], {
    cwd: root,
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    failures.push(`${file}\n${result.stderr || result.stdout}`.trim());
  }
}

if (failures.length > 0) {
  console.error(`Automation syntax check failed:\n\n${failures.join('\n\n')}`);
  process.exit(1);
}

console.log(`Automation syntax check passed for ${files.length} JavaScript modules.`);

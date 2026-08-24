import { spawnSync } from 'node:child_process';

const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';

const generated = spawnSync(pnpm, ['run', 'openapi:build'], {
  cwd: process.cwd(),
  stdio: 'inherit',
});

if (generated.status !== 0) {
  process.exit(generated.status ?? 1);
}

const status = spawnSync(
  'git',
  ['status', '--porcelain', '--untracked-files=all', '--', 'content/docs/openapi'],
  {
    cwd: process.cwd(),
    encoding: 'utf8',
  },
);

if (status.status !== 0) {
  if (status.stderr) process.stderr.write(status.stderr);
  process.exit(status.status ?? 1);
}

if (status.stdout.trim() !== '') {
  console.error('Generated OpenAPI documentation is stale. Run `pnpm openapi:build` and commit the result:');
  console.error(status.stdout.trimEnd());
  process.exit(1);
}

console.log('Generated OpenAPI documentation matches the committed source.');

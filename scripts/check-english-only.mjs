import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const forbiddenLocaleDirs = new Set([
  'ar',
  'de',
  'es',
  'fr',
  'it',
  'ja',
  'ko',
  'pt',
  'ru',
  'zh',
  'zh-CN',
  'zh-TW',
]);
const ignoredDirs = new Set(['.git', '.next', '.source', 'node_modules', '.pnpm-store', '.pnpm', '.vercel', '.turbo', '.cache']);

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const matches = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (ignoredDirs.has(entry.name)) continue;

    const entryPath = path.join(dir, entry.name);
    const relative = path.relative(root, entryPath).replace(/\\/g, '/');

    if (forbiddenLocaleDirs.has(entry.name)) {
      matches.push(relative);
      continue;
    }

    matches.push(...walk(entryPath));
  }

  return matches;
}

const localeDirectories = walk(root);
if (localeDirectories.length > 0) {
  throw new Error(`Non-English locale directories are not allowed:\n${localeDirectories.join('\n')}`);
}

const searchDialog = fs.readFileSync(path.join(root, 'components/search-dialog.tsx'), 'utf8');
if (searchDialog.includes('useI18n') || searchDialog.includes('locale,')) {
  throw new Error('Search must stay English-only and must not depend on Fumadocs locale context.');
}

const rootLayout = fs.readFileSync(path.join(root, 'app/layout.tsx'), 'utf8');
if (!rootLayout.includes('<html lang="en"')) {
  throw new Error('Root layout must explicitly declare English as the only document language.');
}

const searchRoute = fs.readFileSync(path.join(root, 'app/api/search/route.ts'), 'utf8');
if (!searchRoute.includes("language: 'english'")) {
  throw new Error('Search route must use English stemming.');
}

console.log('Docs site is configured as English-only.');

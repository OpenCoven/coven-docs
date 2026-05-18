import fs from 'node:fs/promises';
import path from 'node:path';
import { printErrors, scanURLs, validateFiles } from 'next-validate-link';

const root = process.cwd();
const docsDir = path.join(root, 'content/docs');

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walk(entryPath));
    } else if (entry.name.endsWith('.mdx')) {
      files.push(entryPath);
    }
  }

  return files;
}

function slugForFile(file) {
  const relative = path.relative(docsDir, file).replace(/\\/g, '/').replace(/\.mdx$/, '');
  if (relative === 'index') return [];
  return relative.split('/');
}

async function fileObject(file) {
  const slug = slugForFile(file);
  const url = slug.length === 0 ? '/docs' : `/docs/${slug.join('/')}`;

  return {
    path: file,
    content: await fs.readFile(file, 'utf8'),
    url,
  };
}

const files = await Promise.all((await walk(docsDir)).map(fileObject));
const scanned = await scanURLs({
  preset: 'next',
  populate: {
    'docs/[[...slug]]': files.map((file) => ({
      value: {
        slug: file.url === '/docs' ? [] : file.url.replace(/^\/docs\/?/, '').split('/'),
      },
    })),
  },
});

printErrors(
  await validateFiles(files, {
    scanned,
    ignoreFragment: true,
    markdown: {
      components: {
        Card: { attributes: ['href'] },
      },
    },
    checkRelativePaths: 'as-url',
  }),
  true,
);

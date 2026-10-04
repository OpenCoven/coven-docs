import type { InferPageType } from 'fumadocs-core/source';
import { source } from '@/lib/source';

// Shared by /llms.txt, /llms-full.txt, and the per-page `.md` routes so every
// machine-readable view renders a page the same way.

export const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://docs.opencoven.ai';

type DocsPage = InferPageType<typeof source>;

async function getPageMarkdown(page: DocsPage): Promise<string> {
  // getText('processed') reads page.data._markdown, populated by
  // includeProcessedMarkdown: true in source.config.ts.
  try {
    return await page.data.getText('processed');
  } catch {
    // Fallback: use raw file content if processed markdown is unavailable.
    try {
      return await page.data.getText('raw');
    } catch {
      return '';
    }
  }
}

/** One page as standalone Markdown: title, source URL, description, body. */
export async function renderPageMarkdown(page: DocsPage): Promise<string> {
  const title = page.data.title ?? page.slugs.join('/');
  const description = page.data.description ?? '';
  const markdown = await getPageMarkdown(page);

  const lines = [`# ${title}`, `Source: ${BASE_URL}${page.url}`];
  if (description) lines.push(`> ${description}`);
  lines.push('');
  if (markdown) lines.push(markdown);
  return lines.join('\n');
}

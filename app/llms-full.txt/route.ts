import { source } from '@/lib/source';
import type { InferPageType } from 'fumadocs-core/source';

export const revalidate = false;
export const dynamic = 'force-static';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://docs.opencoven.ai';

async function getPageMarkdown(page: InferPageType<typeof source>): Promise<string> {
  // Use getText('processed') which pulls from page.data._markdown populated by
  // includeProcessedMarkdown: true in source.config.ts
  try {
    const content = await page.data.getText('processed');
    return content;
  } catch {
    // Fallback: use raw file content if processed markdown unavailable
    try {
      const content = await page.data.getText('raw');
      return content;
    } catch {
      return '';
    }
  }
}

export async function GET(): Promise<Response> {
  const pages = source.getPages();

  const chunks: string[] = [
    '# Coven — Full Documentation',
    '',
    'A local runtime for durable, auditable coding-agent work.',
    '',
    `Source: ${BASE_URL}`,
    `Index: ${BASE_URL}/llms.txt`,
    '',
    '---',
    '',
  ];

  for (const page of pages) {
    const url = `${BASE_URL}${page.url}`;
    const title = page.data.title ?? page.slugs.join('/');
    const description = page.data.description ?? '';
    const markdown = await getPageMarkdown(page);

    chunks.push(`# ${title}`);
    chunks.push(`Source: ${url}`);
    if (description) {
      chunks.push(`> ${description}`);
    }
    chunks.push('');
    if (markdown) {
      chunks.push(markdown);
    }
    chunks.push('');
    chunks.push('---');
    chunks.push('');
  }

  return new Response(chunks.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}

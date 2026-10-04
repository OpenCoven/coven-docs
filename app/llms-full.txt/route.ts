import { source } from '@/lib/source';
import { BASE_URL, renderPageMarkdown } from '@/lib/llms';

export const revalidate = false;
export const dynamic = 'force-static';

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
    chunks.push(await renderPageMarkdown(page), '', '---', '');
  }

  return new Response(chunks.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}

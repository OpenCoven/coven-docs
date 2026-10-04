import { source } from '@/lib/source';
import { renderPageMarkdown } from '@/lib/llms';

// Serves /docs/<page>.md (rewritten here in next.config.mjs), the clean
// Markdown that /llms.txt tells agents to request.

export const revalidate = false;
export const dynamicParams = false;

export function generateStaticParams() {
  return source.generateParams();
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug?: string[] }> },
): Promise<Response> {
  const { slug } = await params;
  const page = source.getPage(slug);
  if (!page) return new Response('Not found\n', { status: 404 });

  return new Response(await renderPageMarkdown(page), {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}

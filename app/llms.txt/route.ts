import { source } from '@/lib/source';
import { llms } from 'fumadocs-core/source/llms';
import { BASE_URL } from '@/lib/llms';

export const revalidate = false;
export const dynamic = 'force-static';

export async function GET(): Promise<Response> {
  // index() is async since Fumadocs 16.16; concatenating it unawaited
  // published "[object Promise]" in place of the page list.
  const index = await llms(source).index();

  const header = [
    '# Coven',
    '',
    'A local runtime for durable, auditable coding-agent work.',
    '',
    `> Full docs with page content: ${BASE_URL}/llms-full.txt`,
    `> Append .md to any docs URL for clean Markdown, e.g. ${BASE_URL}/docs/guide/getting-started.md`,
    '',
  ].join('\n');

  return new Response(header + index, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}

import { source } from '@/lib/source';
import { llms } from 'fumadocs-core/source/llms';

export const revalidate = false;
export const dynamic = 'force-static';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://docs.opencoven.ai';

export function GET(): Response {
  const gen = llms(source);
  const index = gen.index();

  const header = [
    '# Coven',
    '',
    'Persistent AI familiars. Composable. Observable. Publishable.',
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

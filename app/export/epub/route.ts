import { source } from '@/lib/source';
import { exportEpub } from 'fumadocs-epub';

export const revalidate = false;

export async function GET(): Promise<Response> {
  const buffer = await exportEpub({
    source,
    title: 'Coven Docs',
    author: 'OpenCoven',
    description: 'Substrate Framework for Persistent Agents',
    getMarkdown: (page) => page.data.getText('processed'),
  });

  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/epub+zip',
      'Content-Disposition': 'attachment; filename="coven-docs.epub"',
    },
  });
}

export const dynamic = 'force-static';
export const revalidate = false;

const commit =
  process.env.VERCEL_GIT_COMMIT_SHA ??
  process.env.GITHUB_SHA ??
  'local';

export function GET(): Response {
  return new Response(
    [
      'product=Coven Docs',
      `commit=${commit}`,
      '',
    ].join('\n'),
    {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
      },
    },
  );
}

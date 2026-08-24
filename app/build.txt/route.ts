export const dynamic = 'force-static';
export const revalidate = false;

const rawCommit =
  process.env.VERCEL_GIT_COMMIT_SHA ??
  process.env.GITHUB_SHA ??
  'local';

if (!/^(?:local|[0-9a-f]{7,64})$/i.test(rawCommit)) {
  throw new Error('Deployment commit identifier contains unsupported characters.');
}

const commit = rawCommit;

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

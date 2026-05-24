// Path-prefix bridge for direct daemon calls (status banner, curl tests).
// Sibling route at app/api/coven-proxy/route.ts handles the fumadocs-openapi
// playground's `?url=` style. Dialing logic lives in lib/coven-proxy-dial.ts.

import { dialDaemon } from '@/lib/coven-proxy-dial';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function proxy(
  req: Request,
  ctx: { params: Promise<{ path?: string[] }> },
): Promise<Response> {
  const { path: segments = [] } = await ctx.params;
  const search = new URL(req.url).search;
  const targetPath = '/' + segments.join('/') + search;

  const method = req.method.toUpperCase();
  const hasBody = method !== 'GET' && method !== 'HEAD';
  const body = hasBody ? Buffer.from(await req.arrayBuffer()) : undefined;

  return dialDaemon(targetPath, method, req.headers, body);
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const HEAD = proxy;

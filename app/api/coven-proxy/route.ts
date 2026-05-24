// fumadocs-openapi playground proxy. The playground composes URLs from the
// spec's server URL + operation path and POSTs them through here as
//
//   GET /api/coven-proxy?url=<encoded-target>&cookie=
//
// We strip the docs-site prefix from the target URL's pathname and forward
// the remaining daemon-side path to the Unix socket via the shared
// dialDaemon() helper.

import { dialDaemon, envelope } from '@/lib/coven-proxy-dial';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PROXY_PREFIX = '/api/coven-proxy';

async function proxy(req: Request): Promise<Response> {
  const reqUrl = new URL(req.url);
  const target = reqUrl.searchParams.get('url');
  if (!target) {
    return envelope(
      'invalid_request',
      'Missing required "url" query parameter.',
      { source: 'playground' },
      400,
    );
  }

  let targetUrl: URL;
  try {
    targetUrl = new URL(target);
  } catch {
    return envelope(
      'invalid_request',
      `Invalid url query parameter: ${target}`,
      { source: 'playground' },
      400,
    );
  }

  // The playground composes URLs like:
  //   spec server:  /api/coven-proxy/api/v1
  //   operation:    /health
  //   final URL:    http://localhost:3000/api/coven-proxy/api/v1/health
  // Strip the docs-site prefix to recover the daemon-side path (/api/v1/...).
  if (!targetUrl.pathname.startsWith(PROXY_PREFIX)) {
    return envelope(
      'invalid_request',
      `Target URL pathname must start with ${PROXY_PREFIX}: ${targetUrl.pathname}`,
      { source: 'playground' },
      400,
    );
  }
  const targetPath = targetUrl.pathname.slice(PROXY_PREFIX.length) + targetUrl.search;

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

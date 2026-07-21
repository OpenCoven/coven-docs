// fumadocs-openapi playground proxy. The playground composes URLs from the
// spec's server URL + operation path and POSTs them through here as
//
//   GET /api/coven-proxy?url=<encoded-target>&cookie=
//
// The spec's server URL is `http://localhost:{port}/api/v1` (port variable,
// default 3000), so the target is an absolute loopback URL. We validate it is
// loopback-only, extract the port for the TCP fallback, and forward the
// daemon-side path via the shared dialDaemon() helper (Unix socket first,
// loopback TCP fallback). Legacy `/api/coven-proxy/...` relative targets from
// cached pages are still accepted.

import {
  DEFAULT_DAEMON_TCP_PORT,
  dialDaemon,
  envelope,
} from '@/lib/coven-proxy-dial';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const LEGACY_PROXY_PREFIX = '/api/coven-proxy';
const LOOPBACK_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]']);

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
    targetUrl = new URL(target, reqUrl.origin);
  } catch {
    return envelope(
      'invalid_request',
      `Invalid url query parameter: ${target}`,
      { source: 'playground' },
      400,
    );
  }

  // The playground composes URLs like:
  //   spec server:  http://localhost:{port}/api/v1   (port default 3000)
  //   operation:    /health
  //   final URL:    http://localhost:3000/api/v1/health
  // Legacy cached specs used the relative server `/api/coven-proxy/api/v1`,
  // which resolves against the docs-site origin — strip that prefix instead.
  let targetPath: string;
  let tcpPort = DEFAULT_DAEMON_TCP_PORT;

  if (targetUrl.pathname.startsWith(LEGACY_PROXY_PREFIX)) {
    targetPath =
      targetUrl.pathname.slice(LEGACY_PROXY_PREFIX.length) + targetUrl.search;
  } else {
    if (targetUrl.protocol !== 'http:') {
      return envelope(
        'invalid_request',
        `Target URL must use http: ${target}`,
        { source: 'playground' },
        400,
      );
    }
    if (!LOOPBACK_HOSTNAMES.has(targetUrl.hostname.toLowerCase())) {
      return envelope(
        'invalid_request',
        `Target URL host must be loopback (localhost / 127.0.0.1 / [::1]): ${target}`,
        { source: 'playground' },
        400,
      );
    }
    const parsedPort = Number(targetUrl.port);
    if (Number.isInteger(parsedPort) && parsedPort > 0 && parsedPort <= 65535) {
      tcpPort = parsedPort;
    }
    targetPath = targetUrl.pathname + targetUrl.search;
  }

  if (!targetPath.startsWith('/api/')) {
    return envelope(
      'invalid_request',
      `Target URL path must start with /api/: ${targetPath}`,
      { source: 'playground' },
      400,
    );
  }

  const method = req.method.toUpperCase();
  const hasBody = method !== 'GET' && method !== 'HEAD';
  const body = hasBody ? Buffer.from(await req.arrayBuffer()) : undefined;

  return dialDaemon(targetPath, method, req.headers, body, {
    tcpPort,
    selfHost: req.headers.get('host'),
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const HEAD = proxy;

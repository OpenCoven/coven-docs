// Shared dial-to-daemon helper used by both proxy route shapes:
//   - app/api/coven-proxy/[...path]/route.ts  (path-prefix; used by the
//     daemon status banner and direct curl tests)
//   - app/api/coven-proxy/route.ts            (?url= style; used by the
//     fumadocs-openapi Try It playground)
//
// Trust model: the daemon's only access control is file-system permissions on
// the socket. This module must NOT forward auth headers, cookies, or anything
// that could let a cross-origin payload smuggle credentials in — it forwards
// only content-type and accept.

import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

const FORWARDED_REQUEST_HEADERS = new Set(['content-type', 'accept']);
const SKIP_RESPONSE_HEADERS =
  /^(content-length|transfer-encoding|connection|keep-alive)$/i;
const REQUEST_TIMEOUT_MS = 5000;

export function resolveSocketPath(): string {
  const home =
    process.env.COVEN_HOME?.trim() || path.join(os.homedir(), '.coven');
  if (!path.isAbsolute(home)) {
    throw new Error(`COVEN_HOME must be an absolute path: ${home}`);
  }
  if (home.split(path.sep).includes('..')) {
    throw new Error(`COVEN_HOME must not contain "..": ${home}`);
  }
  return path.join(home, 'coven.sock');
}

export function envelope(
  code: string,
  message: string,
  details: Record<string, unknown>,
  status: number,
): Response {
  const body = JSON.stringify({ error: { code, message, details } }, null, 2) + '\n';
  return new Response(body, {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

export function daemonUnreachable(
  socketPath: string,
  cause: string,
  extra: Record<string, unknown> = {},
): Response {
  return envelope(
    'daemon_unreachable',
    `No daemon listening at ${socketPath}. Run \`coven daemon start\` and verify with \`coven daemon status\`.`,
    { socketPath, cause, ...extra },
    503,
  );
}

interface DialResult {
  status: number;
  headers: http.IncomingHttpHeaders;
  body: Buffer;
}

function dial(
  opts: http.RequestOptions,
  body: Buffer | undefined,
): Promise<DialResult> {
  return new Promise((resolve, reject) => {
    const req = http.request(opts, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (c: Buffer) => chunks.push(c));
      res.on('end', () =>
        resolve({
          status: res.statusCode ?? 502,
          headers: res.headers,
          body: Buffer.concat(chunks),
        }),
      );
      res.on('error', reject);
    });
    req.on('error', reject);
    req.setTimeout(REQUEST_TIMEOUT_MS, () => {
      const err = Object.assign(new Error('request timed out'), {
        code: 'ETIMEDOUT',
      });
      req.destroy(err);
    });
    if (body && body.byteLength > 0) req.write(body);
    req.end();
  });
}

/**
 * Dial the daemon's Unix socket with the given path/method/body and return
 * a `Response` mirroring the daemon's reply. On connect failure or timeout,
 * returns a 503 `daemon_unreachable` envelope.
 *
 * `targetPath` is the daemon-side path (e.g., `/api/v1/health`), NOT the
 * docs-site bridge path.
 */
export async function dialDaemon(
  targetPath: string,
  method: string,
  requestHeaders: Headers,
  body: Buffer | undefined,
): Promise<Response> {
  // Hosted-detection short-circuit: a Vercel deployment can't reach the
  // reader's local socket. Fail fast with a distinct cause so the status
  // banner renders "run docs locally" guidance instead of a misleading ENOENT.
  if (process.env.VERCEL) {
    return daemonUnreachable('$COVEN_HOME/coven.sock', 'hosted', {
      hosted: true,
    });
  }

  let socketPath: string;
  try {
    socketPath = resolveSocketPath();
  } catch (err) {
    return envelope(
      'invalid_request',
      err instanceof Error ? err.message : String(err),
      { source: 'COVEN_HOME' },
      400,
    );
  }

  const headers: Record<string, string> = { host: 'localhost' };
  for (const [key, value] of requestHeaders) {
    if (FORWARDED_REQUEST_HEADERS.has(key.toLowerCase())) headers[key] = value;
  }
  if (body) headers['content-length'] = String(body.byteLength);

  try {
    const { status, headers: respHeaders, body: respBody } = await dial(
      { socketPath, method, path: targetPath, headers },
      body,
    );

    const out = new Headers();
    for (const [k, v] of Object.entries(respHeaders)) {
      if (SKIP_RESPONSE_HEADERS.test(k)) continue;
      if (v === undefined) continue;
      if (Array.isArray(v)) for (const item of v) out.append(k, item);
      else out.set(k, v);
    }
    // Buffer is a Uint8Array at runtime — valid BodyInit — but @types/node's
    // ArrayBufferLike generic confuses TS's BodyInit union, so cast.
    return new Response(respBody as unknown as BodyInit, {
      status,
      headers: out,
    });
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (
      code === 'ENOENT' ||
      code === 'ECONNREFUSED' ||
      code === 'ETIMEDOUT' ||
      code === 'EACCES'
    ) {
      return daemonUnreachable(socketPath, code);
    }
    return envelope(
      'internal_error',
      err instanceof Error ? err.message : 'Unexpected proxy error',
      { code: code ?? 'unknown' },
      502,
    );
  }
}

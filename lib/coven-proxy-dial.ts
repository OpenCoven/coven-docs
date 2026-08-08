// Shared dial-to-daemon helper used by both proxy route shapes:
//   - app/api/coven-proxy/[...path]/route.ts  (path-prefix; used by the
//     daemon status banner and direct curl tests)
//   - app/api/coven-proxy/route.ts            (?url= style; used by the
//     fumadocs-openapi Try It playground)
//
// Unix-like transport order: $COVEN_HOME/coven.sock is dialed first; if it
// does not answer, we fall back to the daemon's loopback TCP listener
// (`coven daemon serve --tcp 127.0.0.1:<port>`, standard port 3000). The
// fallback only ever dials 127.0.0.1 — never a caller-supplied host. Native
// Windows named pipes are intentionally unsupported by this docs-site bridge.
//
// Trust model: the Unix daemon's access control is file-system permissions on
// the socket (and the loopback/Host guard on TCP). This module must NOT
// forward auth headers, cookies, or anything that could let a cross-origin
// payload smuggle credentials in — it forwards only content-type and accept.

import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

const FORWARDED_REQUEST_HEADERS = new Set(['content-type', 'accept']);
const SKIP_RESPONSE_HEADERS =
  /^(content-length|transfer-encoding|connection|keep-alive)$/i;
const REQUEST_TIMEOUT_MS = 5000;

/** Standard loopback TCP port for `coven daemon serve --tcp 127.0.0.1:3000`. */
export const DEFAULT_DAEMON_TCP_PORT = 3000;

const DIAL_FAILURE_CODES = new Set([
  'ENOENT',
  'ECONNREFUSED',
  'ETIMEDOUT',
  'EACCES',
]);

export interface DialOptions {
  /**
   * Loopback TCP port to fall back to when the Unix socket does not answer.
   * Comes from the playground's server-URL `port` variable.
   */
  tcpPort?: number;
  /**
   * The docs site's own `Host` header (e.g. `localhost:3000`). When the
   * fallback port would dial the docs site itself, the TCP attempt is
   * skipped so a missing daemon can't be masked by a self-response.
   */
  selfHost?: string | null;
}

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

function isLoopbackHost(host: string): boolean {
  const bare = host.replace(/:\d+$/, '').replace(/^\[|\]$/g, '').toLowerCase();
  return bare === 'localhost' || bare === '127.0.0.1' || bare === '::1';
}

function hostPort(host: string): number {
  const match = /:(\d+)$/.exec(host);
  return match ? Number(match[1]) : 80;
}

/**
 * Skip the TCP fallback when it would dial the docs site itself (same
 * loopback port), which would surface a confusing Next.js 404 instead of a
 * clear `daemon_unreachable`.
 */
function isSelfDial(tcpPort: number, selfHost: string | null | undefined): boolean {
  if (!selfHost) return false;
  return isLoopbackHost(selfHost) && hostPort(selfHost) === tcpPort;
}

/**
 * Pretty-print JSON bodies so the Try It panels and curl output are readable.
 * Non-JSON and unparseable payloads pass through untouched.
 */
function formatBody(body: Buffer, contentType: string | undefined): Buffer {
  const mime = (contentType ?? '').split(';')[0].trim().toLowerCase();
  if (mime !== 'application/json' && !mime.endsWith('+json')) return body;
  try {
    const text = body.toString('utf-8');
    const formatted = JSON.stringify(JSON.parse(text), null, 2) + '\n';
    return Buffer.from(formatted, 'utf-8');
  } catch {
    return body;
  }
}

/**
 * Dial the daemon (Unix socket first, loopback TCP fallback) with the given
 * path/method/body and return a `Response` mirroring the daemon's reply, with
 * JSON bodies pretty-printed. On connect failure or timeout on both
 * transports, returns a 503 `daemon_unreachable` envelope.
 *
 * `targetPath` is the daemon-side path (e.g., `/api/v1/health`), NOT the
 * docs-site bridge path.
 */
export async function dialDaemon(
  targetPath: string,
  method: string,
  requestHeaders: Headers,
  body: Buffer | undefined,
  options: DialOptions = {},
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

  const tcpPort = options.tcpPort ?? DEFAULT_DAEMON_TCP_PORT;

  const headers: Record<string, string> = { host: 'localhost' };
  for (const [key, value] of requestHeaders) {
    if (FORWARDED_REQUEST_HEADERS.has(key.toLowerCase())) headers[key] = value;
  }
  if (body) headers['content-length'] = String(body.byteLength);

  let result: DialResult;
  try {
    result = await dial(
      { socketPath, method, path: targetPath, headers },
      body,
    );
  } catch (err: unknown) {
    const socketCause = (err as NodeJS.ErrnoException)?.code;
    if (socketCause === undefined || !DIAL_FAILURE_CODES.has(socketCause)) {
      return envelope(
        'internal_error',
        err instanceof Error ? err.message : 'Unexpected proxy error',
        { code: socketCause ?? 'unknown' },
        502,
      );
    }

    // Socket didn't answer — fall back to the loopback TCP listener.
    if (isSelfDial(tcpPort, options.selfHost)) {
      return daemonUnreachable(socketPath, socketCause, {
        tcp: {
          port: tcpPort,
          cause: 'self',
          hint: `Port ${tcpPort} is this docs site itself. Point the server-URL port variable at your daemon's --tcp port.`,
        },
      });
    }
    try {
      result = await dial(
        { host: '127.0.0.1', port: tcpPort, method, path: targetPath, headers },
        body,
      );
    } catch (tcpErr: unknown) {
      const tcpCause = (tcpErr as NodeJS.ErrnoException)?.code;
      if (tcpCause !== undefined && DIAL_FAILURE_CODES.has(tcpCause)) {
        return daemonUnreachable(socketPath, socketCause, {
          tcp: { port: tcpPort, cause: tcpCause },
        });
      }
      return envelope(
        'internal_error',
        tcpErr instanceof Error ? tcpErr.message : 'Unexpected proxy error',
        { code: tcpCause ?? 'unknown' },
        502,
      );
    }
  }

  const { status, headers: respHeaders, body: respBody } = result;

  const out = new Headers();
  for (const [k, v] of Object.entries(respHeaders)) {
    if (SKIP_RESPONSE_HEADERS.test(k)) continue;
    if (v === undefined) continue;
    if (Array.isArray(v)) for (const item of v) out.append(k, item);
    else out.set(k, v);
  }
  const formatted = formatBody(respBody, respHeaders['content-type']);
  // Buffer is a Uint8Array at runtime — valid BodyInit — but @types/node's
  // ArrayBufferLike generic confuses TS's BodyInit union, so cast.
  return new Response(formatted as unknown as BodyInit, {
    status,
    headers: out,
  });
}

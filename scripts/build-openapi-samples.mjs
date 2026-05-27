#!/usr/bin/env node
// Walks every operation in openapi/coven.daemon.v1.yaml, derives a realistic
// example invocation from each operation's path/query parameters and request
// body schema, and emits an `x-codeSamples` array in four languages.
// Output: openapi/coven.daemon.v1.built.yaml.

import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'openapi/coven.daemon.v1.yaml');
const OUT = path.join(ROOT, 'openapi/coven.daemon.v1.built.yaml');
const API_PREFIX = '/api/v1';

const doc = yaml.load(fs.readFileSync(SRC, 'utf8'));

function deref(ref) {
  if (typeof ref !== 'string' || !ref.startsWith('#/')) return undefined;
  return ref
    .slice(2)
    .split('/')
    .map((seg) => seg.replace(/~1/g, '/').replace(/~0/g, '~'))
    .reduce((acc, key) => (acc == null ? acc : acc[key]), doc);
}
function resolve(node) {
  if (node && typeof node === 'object' && '$ref' in node) {
    const target = deref(node.$ref);
    return target ? resolve(target) : node;
  }
  return node;
}

function firstExample(node) {
  if (!node) return undefined;
  if (node.example !== undefined) return node.example;
  if (Array.isArray(node.examples)) return node.examples[0];
  if (node.examples && typeof node.examples === 'object') {
    return Object.values(node.examples)[0]?.value;
  }
  return undefined;
}

function collectParameters(op, item) {
  const merged = [...(item.parameters ?? []), ...(op.parameters ?? [])];
  return merged.map((p) => resolve(p)).filter(Boolean);
}

function substitutePath(template, params) {
  let url = template;
  for (const p of params) {
    if (p.in !== 'path') continue;
    const example = firstExample(p.schema) ?? `{${p.name}}`;
    url = url.replaceAll(`{${p.name}}`, String(example));
  }
  return url;
}

function buildQueryString(params) {
  const pairs = [];
  for (const p of params) {
    if (p.in !== 'query') continue;
    const example = firstExample(p.schema) ?? p.schema?.default;
    if (!p.required || example === undefined) continue;
    pairs.push(`${p.name}=${encodeURIComponent(String(example))}`);
  }
  return pairs.length ? `?${pairs.join('&')}` : '';
}

function requestBodyExample(op) {
  const rb = op.requestBody;
  if (!rb) return undefined;
  const content = rb.content?.['application/json'];
  if (!content) return undefined;
  if (content.example !== undefined) return content.example;
  if (content.examples && typeof content.examples === 'object') {
    return Object.values(content.examples)[0]?.value;
  }
  return firstExample(resolve(content.schema));
}

function pyLiteral(v, indent = 0) {
  if (v === null) return 'None';
  if (typeof v === 'boolean') return v ? 'True' : 'False';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'string') return JSON.stringify(v);
  if (Array.isArray(v)) {
    if (v.length === 0) return '[]';
    const inner = ' '.repeat(indent + 4);
    const outer = ' '.repeat(indent);
    return (
      '[\n' +
      v.map((x) => inner + pyLiteral(x, indent + 4)).join(',\n') +
      ',\n' +
      outer +
      ']'
    );
  }
  if (typeof v === 'object') {
    const keys = Object.keys(v);
    if (keys.length === 0) return '{}';
    const inner = ' '.repeat(indent + 4);
    const outer = ' '.repeat(indent);
    return (
      '{\n' +
      keys
        .map((k) => `${inner}${JSON.stringify(k)}: ${pyLiteral(v[k], indent + 4)}`)
        .join(',\n') +
      ',\n' +
      outer +
      '}'
    );
  }
  return JSON.stringify(v);
}

function sampleCurl({ method, fullPath, body }) {
  const lines = [`curl --unix-socket "$HOME/.coven/coven.sock" \\`];
  if (method !== 'GET') lines.push(`  -X ${method} \\`);
  if (body !== undefined) {
    lines.push(`  -H 'content-type: application/json' \\`);
    lines.push(`  --data '${JSON.stringify(body)}' \\`);
  }
  lines.push(`  "http://localhost${API_PREFIX}${fullPath}"`);
  return lines.join('\n');
}

function sampleTypeScript({ method, fullPath, body }) {
  const lines = [
    `// npm i undici`,
    `import { Agent, fetch } from 'undici';`,
    `import { homedir } from 'node:os';`,
    `import { join } from 'node:path';`,
    ``,
    `const socketPath = process.env.COVEN_HOME`,
    `  ? join(process.env.COVEN_HOME, 'coven.sock')`,
    `  : join(homedir(), '.coven', 'coven.sock');`,
    ``,
    `const dispatcher = new Agent({ connect: { socketPath } });`,
    ``,
  ];
  if (body !== undefined) {
    lines.push(`const body = ${JSON.stringify(body, null, 2)};`, ``);
  }
  lines.push(`const res = await fetch(`);
  lines.push(`  'http://localhost${API_PREFIX}${fullPath}',`);
  lines.push(`  {`);
  lines.push(`    method: '${method}',`);
  if (body !== undefined) {
    lines.push(`    headers: { 'content-type': 'application/json' },`);
    lines.push(`    body: JSON.stringify(body),`);
  }
  lines.push(`    dispatcher,`);
  lines.push(`  },`);
  lines.push(`);`);
  lines.push(``);
  lines.push(`console.log(res.status, await res.json());`);
  return lines.join('\n');
}

function samplePython({ method, fullPath, body }) {
  const lines = [
    `# pip install httpx`,
    `import os`,
    `import httpx`,
    ``,
    `socket_path = os.path.join(`,
    `    os.environ.get("COVEN_HOME", os.path.expanduser("~/.coven")),`,
    `    "coven.sock",`,
    `)`,
    ``,
    `transport = httpx.HTTPTransport(uds=socket_path)`,
    ``,
    `with httpx.Client(transport=transport, base_url="http://localhost${API_PREFIX}") as client:`,
  ];
  const args = [`"${fullPath}"`];
  if (body !== undefined) args.push(`json=${pyLiteral(body, 8)}`);
  lines.push(`    response = client.${method.toLowerCase()}(${args.join(', ')})`);
  lines.push(`    print(response.status_code, response.json())`);
  return lines.join('\n');
}

function sampleRust({ method, fullPath, body }) {
  const lines = [
    `// Cargo.toml:`,
    `//   hyper      = { version = "0.14", features = ["client", "http1"] }`,
    `//   hyperlocal = "0.8"`,
    `//   tokio      = { version = "1", features = ["full"] }`,
    `//   dirs       = "5"`,
    ``,
    `use hyper::{Body, Client, Method, Request};`,
    `use hyperlocal::{UnixConnector, Uri};`,
    `use std::env;`,
    `use std::path::PathBuf;`,
    ``,
    `#[tokio::main]`,
    `async fn main() -> Result<(), Box<dyn std::error::Error>> {`,
    `    let coven_home = env::var("COVEN_HOME")`,
    `        .map(PathBuf::from)`,
    `        .unwrap_or_else(|_| dirs::home_dir().unwrap().join(".coven"));`,
    `    let socket: PathBuf = coven_home.join("coven.sock");`,
    ``,
    `    let client: Client<UnixConnector, Body> = Client::builder().build(UnixConnector);`,
    `    let uri = Uri::new(socket, "${API_PREFIX}${fullPath}");`,
    ``,
  ];
  if (body !== undefined) {
    lines.push(`    let builder = Request::builder()`);
    lines.push(`        .method(Method::${method})`);
    lines.push(`        .uri(uri)`);
    lines.push(`        .header("content-type", "application/json");`);
    lines.push(``);
    lines.push(`    let req = builder.body(Body::from(r#"${JSON.stringify(body)}"#))?;`);
  } else {
    lines.push(`    let req = Request::builder()`);
    lines.push(`        .method(Method::${method})`);
    lines.push(`        .uri(uri)`);
    lines.push(`        .body(Body::empty())?;`);
  }
  lines.push(``);
  lines.push(`    let resp = client.request(req).await?;`);
  lines.push(`    println!("{}", resp.status());`);
  lines.push(`    Ok(())`);
  lines.push(`}`);
  return lines.join('\n');
}

let injected = 0;
const METHODS = ['get', 'post', 'put', 'patch', 'delete'];

for (const [pathTemplate, item] of Object.entries(doc.paths ?? {})) {
  for (const methodLower of METHODS) {
    const op = item[methodLower];
    if (!op) continue;
    const method = methodLower.toUpperCase();
    const params = collectParameters(op, item);
    const fullPath = substitutePath(pathTemplate, params) + buildQueryString(params);
    const body = requestBodyExample(op);
    const ctx = { method, fullPath, body };
    op['x-codeSamples'] = [
      { lang: 'shell', label: 'curl', source: sampleCurl(ctx) },
      { lang: 'typescript', label: 'TypeScript', source: sampleTypeScript(ctx) },
      { lang: 'python', label: 'Python', source: samplePython(ctx) },
      { lang: 'rust', label: 'Rust', source: sampleRust(ctx) },
    ];
    injected += 1;
  }
}

const header =
  `# THIS FILE IS GENERATED — DO NOT EDIT.\n` +
  `# Source:  openapi/coven.daemon.v1.yaml\n` +
  `# Builder: scripts/build-openapi-samples.mjs\n` +
  `# Run:     pnpm run openapi:build\n#\n`;

fs.writeFileSync(
  OUT,
  header + yaml.dump(doc, { lineWidth: -1, noRefs: true, quotingType: '"' }),
);

console.log(`✓ injected x-codeSamples into ${injected} operations`);
console.log(`✓ wrote ${path.relative(ROOT, OUT)}`);

import { readFile } from 'node:fs/promises';
import process from 'node:process';

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!argument.startsWith('--')) {
      throw new Error(`Unexpected argument: ${argument}`);
    }
    const key = argument.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) {
      throw new Error(`Missing value for --${key}`);
    }
    result[key] = value;
    index += 1;
  }
  return result;
}

const args = parseArgs(process.argv.slice(2));
const key = args.key;
const state = args.state;
const title = args.title;
const repository = process.env.GITHUB_REPOSITORY;
const token = process.env.GITHUB_TOKEN;
const apiBase = process.env.GITHUB_API_URL ?? 'https://api.github.com';

if (!key || !/^[a-z0-9-]+$/.test(key)) {
  throw new Error('--key is required and must use lowercase letters, digits, and hyphens');
}
if (!['open', 'resolved'].includes(state)) {
  throw new Error('--state must be open or resolved');
}
if (!title) throw new Error('--title is required');
if (!repository || !/^[^/]+\/[^/]+$/.test(repository)) {
  throw new Error('GITHUB_REPOSITORY must use owner/repository form');
}
if (!token) throw new Error('GITHUB_TOKEN is required');

const marker = `<!-- coven-docs-automation:${key} -->`;
const headers = {
  Accept: 'application/vnd.github+json',
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent': 'coven-docs-automation/1',
};

async function request(path, options = {}) {
  const response = await fetch(new URL(path, apiBase), {
    ...options,
    headers: { ...headers, ...options.headers },
    signal: AbortSignal.timeout(20_000),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`GitHub API ${response.status}: ${text.slice(0, 1000)}`);
  }
  return text ? JSON.parse(text) : null;
}

const issues = await request(`/repos/${repository}/issues?state=open&per_page=100`);
const issue = issues.find(
  (candidate) => !candidate.pull_request && candidate.body?.includes(marker),
);

if (state === 'open') {
  const bodyText = args['body-file']
    ? await readFile(args['body-file'], 'utf8')
    : 'Automated Coven documentation verification failed.';
  const body = `${marker}\n\n${bodyText.trim()}\n`;

  if (issue) {
    await request(`/repos/${repository}/issues/${issue.number}`, {
      method: 'PATCH',
      body: JSON.stringify({ title, body }),
    });
    console.log(`Updated automation issue #${issue.number}.`);
  } else {
    const created = await request(`/repos/${repository}/issues`, {
      method: 'POST',
      body: JSON.stringify({ title, body }),
    });
    console.log(`Created automation issue #${created.number}.`);
  }
} else if (issue) {
  await request(`/repos/${repository}/issues/${issue.number}/comments`, {
    method: 'POST',
    body: JSON.stringify({
      body: 'Automated verification is healthy again. Closing this incident.',
    }),
  });
  await request(`/repos/${repository}/issues/${issue.number}`, {
    method: 'PATCH',
    body: JSON.stringify({ state: 'closed', state_reason: 'completed' }),
  });
  console.log(`Resolved automation issue #${issue.number}.`);
} else {
  console.log(`No open ${key} automation issue to resolve.`);
}

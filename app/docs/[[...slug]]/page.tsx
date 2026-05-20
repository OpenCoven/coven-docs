import {
  DocsPage,
  DocsBody,
  DocsTitle,
  DocsDescription,
  PageLastUpdate,
  ViewOptionsPopover,
} from 'fumadocs-ui/layouts/docs/page';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import { Icon } from '@iconify/react';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { source } from '@/lib/source';
import { notFound } from 'next/navigation';
import { getGithubLastEdit } from 'fumadocs-core/content/github';
import { getMDXComponents } from '@/components/mdx-components';
import { PageFeedback } from '@/components/page-feedback';
import { PageNavFooter } from '@/components/page-nav-footer';

const REPO = 'OpenCoven/coven-docs';
const SITE = 'https://docs.opencoven.ai';

type PageRef = { url: string; path: string; data: { title: string } };

function buildIssueUrl(page: PageRef) {
  const title = `Docs: ${page.data.title}`;
  const body = [
    `**Page:** [${page.data.title}](${SITE}${page.url})`,
    `**Source:** \`content/docs/${page.path}\``,
    '',
    '### What is the issue?',
    '<!-- Describe the problem, typo, or improvement you noticed. -->',
    '',
    '### Suggested fix (optional)',
    '<!-- If you have a fix in mind, share it here. -->',
  ].join('\n');
  const params = new URLSearchParams({ title, body, labels: 'docs' });
  return `https://github.com/${REPO}/issues/new?${params.toString()}`;
}

function buildFeedbackUrl(page: PageRef) {
  const title = `Feedback: ${page.data.title}`;
  const body = [
    `**Page:** [${page.data.title}](${SITE}${page.url})`,
    `**Source:** \`content/docs/${page.path}\``,
    '',
    '### What was unclear or missing?',
    '<!-- Tell us what made this page unhelpful so we can improve it. -->',
  ].join('\n');
  const params = new URLSearchParams({ title, body, labels: 'docs,feedback' });
  return `https://github.com/${REPO}/issues/new?${params.toString()}`;
}

async function getReadingTimeMinutes(path: string): Promise<number | null> {
  try {
    const content = await readFile(join(process.cwd(), 'content', 'docs', path), 'utf-8');
    const text = content
      .replace(/^---\n[\s\S]*?\n---\n/, '')
      .replace(/```[\s\S]*?```/g, '')
      .replace(/<[^>]+>/g, '')
      .replace(/[#*`_>\-[\](){}!|]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const words = text ? text.split(' ').filter(Boolean).length : 0;
    if (words === 0) return null;
    return Math.max(1, Math.round(words / 220));
  } catch {
    return null;
  }
}

async function getLastModifiedTime(path: string) {
  try {
    return await getGithubLastEdit({
      owner: 'OpenCoven',
      repo: 'coven-docs',
      path: `content/docs/${path}`,
      options: {
        next: {
          revalidate: 60 * 60 * 24,
        },
      },
    });
  } catch {
    return null;
  }
}

export default async function Page({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  const page = source.getPage(slug);
  if (!page) notFound();

  const MDX = page.data.body;
  const githubUrl = `https://github.com/${REPO}/blob/main/content/docs/${page.path}`;
  const issueUrl = buildIssueUrl(page);
  const feedbackUrl = buildFeedbackUrl(page);
  const [readingMinutes, lastModifiedTime] = await Promise.all([
    getReadingTimeMinutes(page.path),
    getLastModifiedTime(page.path),
  ]);

  return (
    <DocsPage
      toc={page.data.toc}
      full={page.data.full}
      tableOfContent={{ style: 'clerk' }}
      breadcrumb={{ includePage: true, includeRoot: true }}
      slots={{ footer: PageNavFooter }}
    >
      <div className="flex justify-end items-center gap-2">
        <a
          href={issueUrl}
          target="_blank"
          rel="noreferrer noopener"
          aria-label="Report an issue with this page on GitHub"
          className={`${buttonVariants({ color: 'secondary', size: 'sm' })} gap-1.5 not-prose`}
        >
          <Icon icon="ph:bug-duotone" width={14} aria-hidden="true" />
          Report issue
        </a>
        <ViewOptionsPopover githubUrl={githubUrl} />
      </div>
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      {readingMinutes !== null && (
        <p className="text-xs text-fd-muted-foreground not-prose -mt-2 mb-4 inline-flex items-center gap-1.5">
          <Icon icon="ph:clock-duotone" width={13} aria-hidden="true" />
          {readingMinutes} min read
        </p>
      )}
      <DocsBody>
        <MDX components={getMDXComponents()} />
      </DocsBody>
      <PageFeedback feedbackIssueUrl={feedbackUrl} />
      {lastModifiedTime && <PageLastUpdate date={lastModifiedTime} />}
    </DocsPage>
  );
}

export async function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  const page = source.getPage(slug);
  if (!page) notFound();

  return {
    title: page.data.title,
    description: page.data.description,
  };
}

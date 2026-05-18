import {
  DocsPage,
  DocsBody,
  DocsTitle,
  DocsDescription,
  PageLastUpdate,
  ViewOptionsPopover,
} from 'fumadocs-ui/layouts/docs/page';
import { source } from '@/lib/source';
import { notFound } from 'next/navigation';
import { getGithubLastEdit } from 'fumadocs-core/content/github';
import { getMDXComponents } from '@/components/mdx-components';

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
  const githubUrl = `https://github.com/OpenCoven/coven-docs/blob/main/content/docs/${page.path}`;
  const lastModifiedTime = await getLastModifiedTime(page.path);

  return (
    <DocsPage
      toc={page.data.toc}
      full={page.data.full}
      tableOfContent={{ style: 'clerk' }}
    >
      <ViewOptionsPopover githubUrl={githubUrl} />
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <DocsBody>
        <MDX components={getMDXComponents()} />
      </DocsBody>
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

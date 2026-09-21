import type { MDXComponents } from 'mdx/types';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import { CodeBlock, Pre } from 'fumadocs-ui/components/codeblock';
import { File, Files, Folder } from 'fumadocs-ui/components/files';
import { ImageZoom } from 'fumadocs-ui/components/image-zoom';
import { Step, Steps } from 'fumadocs-ui/components/steps';
import * as TabsComponents from 'fumadocs-ui/components/tabs';
import { Accordion, Accordions } from 'fumadocs-ui/components/accordion';
import { TypeTable } from 'fumadocs-ui/components/type-table';
import type { OperationItem, WebhookItem } from 'fumadocs-openapi/ui';
import { Mermaid } from '@/components/mermaid';
import { DocsDataTable } from '@/components/docs-data-table';
import { ApiConsole } from '@/components/api-runner/api-console';
import { ApiRequest } from '@/components/api-runner/api-request';
import { OpenAPIPage } from '@/components/openapi-page-client';
import { openapi } from '@/lib/openapi';

interface APIPageProps {
  document: string;
  showTitle?: boolean;
  showDescription?: boolean;
  operations?: OperationItem[];
  webhooks?: WebhookItem[];
}

async function APIPage({ document, ...props }: APIPageProps) {
  const { bundled } = await openapi.getSchema(document);

  return (
    <OpenAPIPage
      {...props}
      document={document}
      payload={{ bundled, proxyUrl: openapi.options.proxyUrl }}
    />
  );
}

export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultMdxComponents,
    ...TabsComponents,
    Accordion,
    Accordions,
    APIPage,
    ApiConsole,
    ApiRequest,
    DocsDataTable,
    File,
    Files,
    Folder,
    Mermaid,
    Step,
    Steps,
    TypeTable,
    pre: ({ ref: _ref, ...props }) => (
      <CodeBlock {...props}>
        <Pre>{props.children}</Pre>
      </CodeBlock>
    ),
    img: ({ src, alt, ...props }) => (
      <ImageZoom {...props} src={typeof src === 'string' ? src : undefined} alt={alt ?? ''} />
    ),
    ...components,
  };
}

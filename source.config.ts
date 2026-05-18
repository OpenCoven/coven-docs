import { defineDocs, defineConfig } from 'fumadocs-mdx/config';
import remarkMermaid from './lib/remark-mermaid.mjs';

export const docs = defineDocs({
  dir: 'content/docs',
});

export default defineConfig({
  mdxOptions: {
    remarkPlugins: (plugins) => [...plugins, remarkMermaid],
  },
});

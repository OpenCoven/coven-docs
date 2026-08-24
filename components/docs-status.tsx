import { getDocsSection, getStabilityLabel } from '@/lib/docs-manifest';

interface DocsStatusProps {
  sectionSlug?: string;
}

export function DocsStatus({ sectionSlug }: DocsStatusProps) {
  const section = getDocsSection(sectionSlug);
  if (!section) return null;

  return (
    <div
      className="not-prose mb-4 flex flex-wrap items-center gap-2 text-xs text-fd-muted-foreground"
      data-docs-stability={section.stability}
    >
      <span className="rounded-full border border-fd-border bg-fd-secondary px-2 py-0.5 font-semibold uppercase tracking-wide text-fd-foreground">
        {getStabilityLabel(section.stability)}
      </span>
      <span>{section.title}</span>
      <span aria-hidden="true">·</span>
      <a
        href={`https://github.com/${section.sourceRepo}`}
        target="_blank"
        rel="noreferrer noopener"
        className="underline decoration-fd-border underline-offset-4 hover:text-fd-foreground"
      >
        Contract source: {section.sourceRepo}
      </a>
    </div>
  );
}

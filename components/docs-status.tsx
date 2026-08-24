import { Icon } from '@iconify/react';
import {
  getDocsSection,
  getStabilityLabel,
  type DocsStability,
} from '@/lib/docs-manifest';

interface DocsStatusProps {
  sectionSlug?: string;
}

const stabilityIcons: Record<DocsStability, string> = {
  stable: 'ph:seal-check-duotone',
  preview: 'ph:clock-countdown-duotone',
  experimental: 'ph:flask-duotone',
  historical: 'ph:archive-duotone',
};

export function DocsStatus({ sectionSlug }: DocsStatusProps) {
  const section = getDocsSection(sectionSlug);
  if (!section) return null;

  return (
    <div
      className="coven-docs-status not-prose"
      data-docs-stability={section.stability}
    >
      <span className="coven-docs-status-badge">
        <Icon
          icon={stabilityIcons[section.stability]}
          width={14}
          aria-hidden="true"
        />
        {getStabilityLabel(section.stability)}
      </span>
      <span className="coven-docs-status-section">{section.title}</span>
      <span className="coven-docs-status-separator" aria-hidden="true">/</span>
      <a
        href={`https://github.com/${section.sourceRepo}`}
        target="_blank"
        rel="noreferrer noopener"
        className="coven-docs-status-source"
      >
        Contract · {section.sourceRepo}
        <Icon icon="ph:arrow-up-right" width={12} aria-hidden="true" />
      </a>
    </div>
  );
}

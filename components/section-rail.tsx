'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@iconify/react';
import { useSearchContext } from 'fumadocs-ui/contexts/search';
import { useSidebar } from 'fumadocs-ui/layouts/docs/slots/sidebar';
import { fallbackSectionIcon, sectionIcons } from '@/lib/section-icons';
import { useModifierKey } from '@/lib/use-modifier-key';

export interface RailSection {
  slug: string;
  title: string;
}

/**
 * Thin icon rail shown while the sidebar is collapsed: the docs overview,
 * search, one link per section, and a way back to the full sidebar. It
 * replaces Fumadocs' floating collapsed panel, which sat over the page, and
 * the layout reserves its width so nothing overlaps the content.
 */
export function SectionRail({ sections }: { sections: RailSection[] }) {
  const { collapsed, setCollapsed, mode } = useSidebar();
  const { enabled: searchEnabled, setOpenSearch } = useSearchContext();
  const pathname = usePathname();
  const modifier = useModifierKey();

  if (mode !== 'full' || !collapsed) return null;

  const activeSlug = sections.find(
    ({ slug }) => pathname === `/docs/${slug}` || pathname.startsWith(`/docs/${slug}/`),
  )?.slug;

  return (
    <nav className="coven-section-rail" aria-label="Documentation sections">
      <Link
        href="/docs"
        className="coven-section-rail-item"
        aria-label="Docs overview"
        aria-current={pathname === '/docs' ? 'page' : undefined}
        data-active={pathname === '/docs'}
      >
        <img className="coven-docs-brand-logo" src="/opencoven-logo.svg" alt="" width={24} height={24} />
        <span className="coven-section-rail-tip" aria-hidden="true">
          Docs overview
        </span>
      </Link>

      {searchEnabled && (
        <button
          type="button"
          className="coven-section-rail-item"
          aria-label="Search docs"
          aria-keyshortcuts="Meta+K Control+K"
          onClick={() => setOpenSearch(true)}
        >
          <Icon icon="ph:magnifying-glass" width={18} aria-hidden="true" />
          <span className="coven-section-rail-tip" aria-hidden="true">
            Search
            <kbd>{modifier}K</kbd>
          </span>
        </button>
      )}

      <span className="coven-section-rail-divider" aria-hidden="true" />

      <ul className="coven-section-rail-list">
        {sections.map(({ slug, title }) => {
          const active = slug === activeSlug;
          return (
            <li key={slug}>
              <Link
                href={`/docs/${slug}`}
                className="coven-section-rail-item"
                aria-label={title}
                aria-current={active ? 'true' : undefined}
                data-active={active}
              >
                <Icon icon={sectionIcons[slug] ?? fallbackSectionIcon} width={18} aria-hidden="true" />
                <span className="coven-section-rail-tip" aria-hidden="true">
                  {title}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        className="coven-section-rail-item coven-section-rail-expand"
        aria-label="Expand sidebar"
        aria-controls="nd-sidebar"
        aria-expanded={false}
        aria-keyshortcuts="Meta+Backslash Control+Backslash"
        onClick={() => setCollapsed(false)}
      >
        <Icon icon="ph:sidebar-simple-duotone" width={18} aria-hidden="true" />
        <span className="coven-section-rail-tip" aria-hidden="true">
          Expand sidebar
          <kbd>
            {modifier}
            {'\\'}
          </kbd>
        </span>
      </button>
    </nav>
  );
}

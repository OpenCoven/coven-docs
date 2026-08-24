'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useDocsSearch } from 'fumadocs-core/search/client';
import { track } from '@vercel/analytics';
import type { SearchLink, SharedProps } from 'fumadocs-ui/contexts/search';
import {
  SearchDialog,
  SearchDialogClose,
  SearchDialogContent,
  SearchDialogHeader,
  SearchDialogIcon,
  SearchDialogInput,
  SearchDialogList,
  SearchDialogOverlay,
} from 'fumadocs-ui/components/dialog/search';
import { docsSections } from '@/lib/docs-manifest';

const filters = [
  { name: 'All', value: undefined, description: 'Search every Coven doc' },
  ...docsSections
    .filter((section) => section.searchable)
    .map((section) => ({
      name: section.title,
      value: section.slug,
      description: section.searchDescription,
    })),
];

export function CovenSearchDialog({
  links = [],
  ...props
}: SharedProps & { links?: SearchLink[] }) {
  const [tag, setTag] = useState<string | undefined>();
  const [filterOpen, setFilterOpen] = useState(false);
  const lastTrackedEmptySearch = useRef<string | null>(null);
  const { search, setSearch, query } = useDocsSearch({
    type: 'fetch',
    tag,
  });

  const defaultItems = useMemo(() => {
    if (links.length === 0) return null;

    return links.map(([name, link]) => ({
      type: 'page' as const,
      id: name,
      content: name,
      url: link,
    }));
  }, [links]);
  const activeFilter = filters.find((filter) => filter.value === tag) ?? filters[0];

  useEffect(() => {
    const normalized = search.trim();
    if (normalized.length < 3 || query.data !== 'empty') return;

    const key = `${tag ?? 'all'}:${normalized}`;
    if (lastTrackedEmptySearch.current === key) return;
    lastTrackedEmptySearch.current = key;

    track('docs_search_zero_results', {
      filter: tag ?? 'all',
      queryLength: normalized.length,
    });
  }, [query.data, search, tag]);

  return (
    <SearchDialog
      search={search}
      onSearchChange={setSearch}
      isLoading={query.isLoading}
      {...props}
    >
      <SearchDialogOverlay />
      <SearchDialogContent>
        <SearchDialogHeader>
          <SearchDialogIcon />
          <SearchDialogInput />
          <SearchDialogClose />
        </SearchDialogHeader>
        <div className="border-b px-3 py-2 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="shrink-0 text-fd-muted-foreground">Filter</span>
            <button
              type="button"
              aria-haspopup="listbox"
              aria-expanded={filterOpen}
              className="inline-flex min-w-40 max-w-full items-center justify-between gap-2 rounded-md border bg-fd-background px-2.5 py-1.5 text-left text-fd-foreground transition-colors hover:bg-fd-accent"
              onClick={() => setFilterOpen((open) => !open)}
            >
              <span className="min-w-0 truncate">{activeFilter.name}</span>
              <span aria-hidden="true" className="text-xs text-fd-muted-foreground">⌄</span>
            </button>
          </div>
          {filterOpen && (
            <div
              role="listbox"
              className="mt-2 grid w-full min-w-0 gap-1 rounded-lg border bg-fd-popover p-1 shadow-xl"
            >
              {filters.map((filter) => {
                const active = filter.value === tag;

                return (
                  <button
                    key={filter.name}
                    type="button"
                    role="option"
                    aria-selected={active}
                    className="rounded-md px-2.5 py-2 text-left text-sm transition-colors hover:bg-fd-accent aria-selected:bg-fd-accent"
                    onClick={() => {
                      setTag(filter.value);
                      setFilterOpen(false);
                    }}
                  >
                    <span className="block font-medium text-fd-foreground">{filter.name}</span>
                    <span className="block text-xs leading-relaxed text-fd-muted-foreground">{filter.description}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <SearchDialogList items={query.data !== 'empty' ? query.data : defaultItems} />
      </SearchDialogContent>
    </SearchDialog>
  );
}

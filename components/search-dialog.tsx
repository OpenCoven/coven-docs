'use client';

import { type KeyboardEvent, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useDocsSearch } from 'fumadocs-core/search/client';
import { track } from '@vercel/analytics';
import { Icon } from '@iconify/react';
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
import { fallbackSectionIcon, sectionIcons } from '@/lib/section-icons';
import styles from './search-dialog.module.css';

const filters = [
  { name: 'All', value: undefined, description: 'Search every Coven doc', icon: 'ph:books-duotone' },
  ...docsSections
    .filter((section) => section.searchable)
    .map((section) => ({
      name: section.title,
      value: section.slug,
      description: section.searchDescription,
      icon: sectionIcons[section.slug] ?? fallbackSectionIcon,
    })),
];

export function CovenSearchDialog({
  links = [],
  ...props
}: SharedProps & { links?: SearchLink[] }) {
  const [tag, setTag] = useState<string | undefined>();
  const [filterOpen, setFilterOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const lastTrackedEmptySearch = useRef<string | null>(null);
  const scopeRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();
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
  const activeIndex = Math.max(0, filters.findIndex((filter) => filter.value === tag));
  const activeFilter = filters[activeIndex];
  const searching = search.trim().length > 0;
  // Label what is on screen: suggestions show until a query's results arrive.
  const showingResults = query.data !== 'empty';
  const listLabel = showingResults
    ? tag
      ? `Results in ${activeFilter.name}`
      : 'Results'
    : searching
      ? 'Searching…'
      : 'Suggested';

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

  // Close the scope menu on a pointer press anywhere outside it.
  useEffect(() => {
    if (!filterOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!scopeRef.current?.contains(event.target as Node)) setFilterOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [filterOpen]);

  // Opening the menu moves focus into it, starting on the current scope.
  useEffect(() => {
    if (!filterOpen) return;
    setHighlight(activeIndex);
    // preventScroll: focusing must not scroll the dialog's own content.
    listboxRef.current?.focus({ preventScroll: true });
  }, [filterOpen, activeIndex]);

  // Keep the highlighted option in view by scrolling the menu itself only.
  function keepVisible(index: number) {
    const listbox = listboxRef.current;
    const option = document.getElementById(`${listboxId}-${index}`);
    if (!listbox || !option) return;
    if (option.offsetTop < listbox.scrollTop) listbox.scrollTop = option.offsetTop;
    else if (option.offsetTop + option.offsetHeight > listbox.scrollTop + listbox.clientHeight)
      listbox.scrollTop = option.offsetTop + option.offsetHeight - listbox.clientHeight;
  }

  function closeFilter(returnFocusTo: 'trigger' | 'input' = 'trigger') {
    setFilterOpen(false);
    (returnFocusTo === 'input' ? inputRef.current : triggerRef.current)?.focus();
  }

  function choose(index: number) {
    setTag(filters[index].value);
    closeFilter('input');
  }

  function onListboxKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const last = filters.length - 1;
    const moves: Record<string, number> = {
      ArrowDown: Math.min(highlight + 1, last),
      ArrowUp: Math.max(highlight - 1, 0),
      Home: 0,
      End: last,
    };
    // The result list also listens for arrows and Enter further up; keep
    // these keys inside the scope menu so Enter picks a scope rather than
    // opening the highlighted result.
    if (event.key in moves) {
      event.preventDefault();
      event.stopPropagation();
      setHighlight(moves[event.key]);
      keepVisible(moves[event.key]);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      event.stopPropagation();
      choose(highlight);
    } else if (event.key === 'Tab') {
      setFilterOpen(false);
    }
  }

  function Empty() {
    return (
      <div className={styles.empty}>
        <p>
          No results for <strong>“{search.trim()}”</strong>
          {tag ? <> in {activeFilter.name}</> : null}.
        </p>
        {tag ? (
          <button type="button" className={styles.emptyAction} onClick={() => setTag(undefined)}>
            Search all docs
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <SearchDialog
      search={search}
      onSearchChange={setSearch}
      isLoading={query.isLoading}
      {...props}
    >
      <SearchDialogOverlay />
      <SearchDialogContent
        className={styles.content}
        onEscapeKeyDown={(event) => {
          // Escape closes the scope menu first, then the dialog.
          if (!filterOpen) return;
          event.preventDefault();
          closeFilter();
        }}
      >
        <SearchDialogHeader>
          <SearchDialogIcon />
          <SearchDialogInput ref={inputRef} />
          <SearchDialogClose />
        </SearchDialogHeader>

        <div ref={scopeRef} className={styles.scope}>
          <span className={styles.scopeLabel}>Filter</span>
          <button
            ref={triggerRef}
            type="button"
            aria-haspopup="listbox"
            aria-expanded={filterOpen}
            aria-controls={listboxId}
            className={styles.trigger}
            data-scoped={tag !== undefined}
            onClick={() => setFilterOpen((open) => !open)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown' && !filterOpen) {
                event.preventDefault();
                event.stopPropagation();
                setFilterOpen(true);
              }
            }}
          >
            <Icon icon={activeFilter.icon} width={15} aria-hidden="true" />
            <span className={styles.triggerName}>{activeFilter.name}</span>
            <Icon icon="ph:caret-up-down" width={13} aria-hidden="true" className={styles.caret} />
          </button>

          {filterOpen && (
            <div
              ref={listboxRef}
              id={listboxId}
              role="listbox"
              aria-label="Search scope"
              aria-activedescendant={`${listboxId}-${highlight}`}
              tabIndex={-1}
              className={styles.listbox}
              onKeyDown={onListboxKeyDown}
            >
              {filters.map((filter, index) => {
                const selected = filter.value === tag;

                return (
                  <div
                    key={filter.name}
                    id={`${listboxId}-${index}`}
                    role="option"
                    aria-selected={selected}
                    data-highlighted={index === highlight}
                    className={styles.option}
                    onPointerMove={() => setHighlight(index)}
                    onClick={() => choose(index)}
                  >
                    <Icon icon={filter.icon} width={16} aria-hidden="true" className={styles.optionIcon} />
                    <span className={styles.optionText}>
                      <span className={styles.optionName}>{filter.name}</span>
                      <span className={styles.optionDescription}>{filter.description}</span>
                    </span>
                    {selected ? (
                      <Icon icon="ph:check-bold" width={13} aria-hidden="true" className={styles.optionCheck} />
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* One wrapper, so the dialog's per-child divider sits under the list
            rather than between the label and its results. */}
        <div className={styles.results}>
          <p className={styles.listLabel}>{listLabel}</p>
          <SearchDialogList
            items={query.data !== 'empty' ? query.data : defaultItems}
            Empty={Empty}
          />
        </div>

        <div className={styles.hints} aria-hidden="true">
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd> Navigate
          </span>
          <span>
            <kbd>↵</kbd> Open
          </span>
          <span>
            <kbd>Esc</kbd> Close
          </span>
        </div>
      </SearchDialogContent>
    </SearchDialog>
  );
}

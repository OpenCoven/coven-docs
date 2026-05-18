'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import styles from './docs-data-table.module.css';

export type DocsDataColumn = {
  key: string;
  label: string;
  filter?: boolean;
};

export type DocsDataRow = Record<string, string>;

type SortState = {
  key: string;
  direction: 'asc' | 'desc';
};

type Props = {
  caption: string;
  columns: DocsDataColumn[];
  rows: DocsDataRow[];
  searchPlaceholder?: string;
  preserveOrder?: boolean;
};

type TableSpec = Props & {
  id: string;
  label: string;
};

type TabbedProps = {
  tabs: TableSpec[];
};

const markerPattern = /([\u0060][^\u0060]+[\u0060]|\*\*[^*]+\*\*)/g;
const tick = String.fromCharCode(96);

function normalize(value: string) {
  return value.toLowerCase().replace(/[\u0060*]/g, '');
}

function renderInline(value: string) {
  const parts = value.split(markerPattern).filter(Boolean);

  return parts.map((part, index) => {
    if (part.startsWith(tick) && part.endsWith(tick)) {
      return <code key={index}>{part.slice(1, -1)}</code>;
    }

    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }

    return part;
  });
}

// Outer wrapper: renders a static, non-interactive table until the user
// scrolls near it (or it's already above the fold). Then activates the
// full interactive implementation. The static placeholder preserves layout
// (no CLS), preserves SEO (every row is in SSR HTML), and skips ~30 icon
// components + all sort/filter/search state until the table is actually
// needed. Above-the-fold tables activate on the first effect tick.
export function DocsDataTable(props: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (active) return;
    const el = wrapRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setActive(true);
      return;
    }
    // If already visible (or within 400 px of the viewport), activate now.
    const rect = el.getBoundingClientRect();
    if (rect.top < (window.innerHeight || 800) + 400) {
      setActive(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setActive(true);
          io.disconnect();
        }
      },
      { rootMargin: '400px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [active]);

  if (active) {
    return <InteractiveDocsDataTable {...props} />;
  }

  return (
    <div ref={wrapRef} className={styles.shell} aria-busy="true">
      <div className={styles.scroller}>
        <table className={styles.table}>
          <caption>{props.caption}</caption>
          <thead>
            <tr>
              {props.columns.map((column) => (
                <th key={column.key} scope="col">
                  <span>{column.label}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {props.rows.map((row, rowIndex) => (
              <tr key={props.columns.map((c) => row[c.key]).join('|') || rowIndex}>
                {props.columns.map((column) => (
                  <td key={column.key}>{renderInline(row[column.key] ?? '')}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function InteractiveDocsDataTable({ caption, columns, rows, searchPlaceholder = 'Filter table...', preserveOrder = false }: Props) {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [sort, setSort] = useState<SortState>({ key: preserveOrder ? '' : (columns[0]?.key ?? ''), direction: 'asc' });

  const filterableColumns = useMemo(() => columns.filter((column) => column.filter), [columns]);

  const filterOptions = useMemo(() => {
    return Object.fromEntries(
      filterableColumns.map((column) => [
        column.key,
        Array.from(new Set(rows.map((row) => row[column.key]).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
      ]),
    );
  }, [filterableColumns, rows]);

  const visibleRows = useMemo(() => {
    const normalizedQuery = normalize(query.trim());

    return rows
      .filter((row) => {
        if (normalizedQuery) {
          const haystack = normalize(columns.map((column) => row[column.key] ?? '').join(' '));
          if (!haystack.includes(normalizedQuery)) return false;
        }

        return Object.entries(filters).every(([key, value]) => !value || row[key] === value);
      })
      .sort((a, b) => {
        if (!sort.key) return 0;

        const aValue = normalize(a[sort.key] ?? '');
        const bValue = normalize(b[sort.key] ?? '');
        const result = aValue.localeCompare(bValue, undefined, { numeric: true, sensitivity: 'base' });
        return sort.direction === 'asc' ? result : -result;
      });
  }, [columns, filters, query, rows, sort]);

  function updateSort(key: string) {
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  }

  function sortIcon(key: string) {
    if (sort.key !== key) return 'ph:arrows-down-up-duotone';
    return sort.direction === 'asc' ? 'ph:sort-ascending-duotone' : 'ph:sort-descending-duotone';
  }

  return (
    <div className={styles.shell}>
      <div className={styles.toolbar}>
        <input
          className={styles.search}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
        />
        {filterableColumns.length > 0 ? (
          <div className={styles.filters}>
            {filterableColumns.map((column) => (
              <select
                className={styles.select}
                key={column.key}
                value={filters[column.key] ?? ''}
                onChange={(event) => setFilters((current) => ({ ...current, [column.key]: event.target.value }))}
                aria-label={'Filter by ' + column.label}
              >
                <option value="">All {column.label.toLowerCase()}</option>
                {filterOptions[column.key].map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            ))}
          </div>
        ) : null}
      </div>

      <div className={styles.scroller}>
        <table className={styles.table}>
          <caption>{caption}</caption>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key} scope="col" aria-sort={sort.key === column.key ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <button className={styles.sort} type="button" onClick={() => updateSort(column.key)}>
                    <span>{column.label}</span>
                    <Icon className={styles.direction} icon={sortIcon(column.key)} width={16} aria-hidden="true" />
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.length > 0 ? (
              visibleRows.map((row, rowIndex) => (
                <tr key={columns.map((column) => row[column.key]).join('|') || rowIndex}>
                  {columns.map((column) => (
                    <td key={column.key}>{renderInline(row[column.key] ?? '')}</td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td className={styles.empty} colSpan={columns.length}>
                  No matching rows.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className={styles.meta}>
        <span>{visibleRows.length} visible</span>
        <span>{rows.length} total</span>
      </div>
    </div>
  );
}

export function DocsTabbedTables({ tabs }: TabbedProps) {
  const [activeId, setActiveId] = useState(tabs[0]?.id ?? '');
  const active = tabs.find((tab) => tab.id === activeId) ?? tabs[0];

  if (!active) return null;

  return (
    <div className={styles.tabbed}>
      <div className={styles.tablist} role="tablist" aria-label="Table views">
        {tabs.map((tab) => (
          <button
            className={tab.id === active.id ? styles.tabActive : styles.tab}
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={tab.id === active.id}
            aria-controls={'table-panel-' + tab.id}
            id={'table-tab-' + tab.id}
            onClick={() => setActiveId(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div id={'table-panel-' + active.id} role="tabpanel" aria-labelledby={'table-tab-' + active.id}>
        <DocsDataTable
          caption={active.caption}
          columns={active.columns}
          rows={active.rows}
          searchPlaceholder={active.searchPlaceholder}
        />
      </div>
    </div>
  );
}

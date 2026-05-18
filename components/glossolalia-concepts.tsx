'use client';

import { useMemo, useState } from 'react';
import styles from './glossolalia-concepts.module.css';

export type GlossolaliaConcept = {
  term: string;
  definition: string;
  why: string;
  related: string;
};

type Props = {
  caption: string;
  eyebrow?: string;
  intro: string;
  pathways?: string[][];
  searchPlaceholder?: string;
  rows: GlossolaliaConcept[];
};

const markerPattern = /([`][^`]+[`]|\*\*[^*]+\*\*)/g;
const tick = String.fromCharCode(96);

function normalize(value: string) {
  return value.toLowerCase().replace(/[`*]/g, '');
}

function slugify(value: string) {
  return normalize(value).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
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

function relatedTerms(value: string) {
  return value.split(',').map((term) => term.trim()).filter(Boolean);
}

function defaultPathways(rows: GlossolaliaConcept[]) {
  const terms = rows.slice(0, 6).map((row) => row.term);
  return [terms.slice(0, 3), terms.slice(3, 6)].filter((group) => group.length > 0);
}

export function GlossolaliaConceptMap({
  caption,
  eyebrow = 'Foundational order',
  intro,
  pathways,
  searchPlaceholder = 'Filter concepts...',
  rows,
}: Props) {
  const [query, setQuery] = useState('');

  const captionId = slugify(caption) + '-caption';
  const availableSlugs = useMemo(() => new Set(rows.map((row) => slugify(row.term))), [rows]);
  const pathwayGroups = useMemo(() => pathways ?? defaultPathways(rows), [pathways, rows]);
  const visibleRows = useMemo(() => {
    const normalizedQuery = normalize(query.trim());
    if (!normalizedQuery) return rows;

    return rows.filter((row) => normalize([row.term, row.definition, row.why, row.related].join(' ')).includes(normalizedQuery));
  }, [query, rows]);

  return (
    <section className={styles.shell} aria-labelledby={captionId}>
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>{eyebrow}</p>
          <h3 id={captionId} className={styles.title}>{caption}</h3>
          <p className={styles.intro}>{intro}</p>
        </div>
        <input
          className={styles.search}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
        />
      </div>

      {pathwayGroups.length > 0 ? (
        <div className={styles.pathways} aria-label={caption + ' pathways'}>
          {pathwayGroups.map((group, groupIndex) => (
            <div className={styles.pathway} key={group.join('|') || groupIndex}>
              {group.map((term) => (
                <span key={term}>{renderInline(term)}</span>
              ))}
            </div>
          ))}
        </div>
      ) : null}

      <div className={styles.grid}>
        {visibleRows.length > 0 ? (
          visibleRows.map((row, index) => (
            <article className={styles.card} id={slugify(row.term)} key={row.term}>
              <div className={styles.termRow}>
                <span className={styles.index}>{String(index + 1).padStart(2, '0')}</span>
                <h4 className={styles.term}>{renderInline(row.term)}</h4>
              </div>
              <p className={styles.definition}>{renderInline(row.definition)}</p>
              <p className={styles.why}>{renderInline(row.why)}</p>
              <div className={styles.related} aria-label={'Related terms for ' + row.term}>
                {relatedTerms(row.related).map((term) => {
                  const slug = slugify(term);
                  return availableSlugs.has(slug) ? (
                    <a className={styles.chip} href={'#' + slug} key={term}>{renderInline(term)}</a>
                  ) : (
                    <span className={styles.chipMuted} key={term}>{renderInline(term)}</span>
                  );
                })}
              </div>
            </article>
          ))
        ) : (
          <p className={styles.empty}>No matching concepts.</p>
        )}
      </div>

      <div className={styles.meta}>
        <span>{visibleRows.length} visible</span>
        <span>{rows.length} total</span>
      </div>
    </section>
  );
}

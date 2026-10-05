import type { ReactNode } from 'react';
import { platformTokens, platformTokensLabel } from '@/lib/platforms';
import styles from './platform.module.css';

/**
 * Content for some platforms only. The server renders every block; the
 * inline boot script and generated CSS hide blocks for other platforms, so
 * "All platforms", print, and the Markdown exports keep everything.
 *
 *   <Platform only="windows">…</Platform>
 *   <Platform only="macos linux">…</Platform>
 *
 * Keep headings out of a block: a hidden heading would still sit in the
 * table of contents. The label says which platform the block is for.
 */
export function Platform({ only, children }: { only: string; children: ReactNode }) {
  const tokens = platformTokens(only);
  return (
    <div className={styles.block} data-platforms={tokens.join(' ')}>
      <p className={`${styles.label} not-prose`}>{platformTokensLabel(tokens)}</p>
      {children}
    </div>
  );
}

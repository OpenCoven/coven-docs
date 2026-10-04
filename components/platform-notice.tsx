'use client';

import { Icon } from '@iconify/react';
import { PlatformMenu, platformStateLabel } from '@/components/platform-menu';
import { setPlatform, usePlatform } from '@/lib/platform-store';
import styles from './platform.module.css';

/**
 * Shown above pages with platform-specific blocks, so a reader always knows
 * the page is filtered and can widen it again.
 */
export function PlatformNotice() {
  const state = usePlatform();
  const filtered = Boolean(state?.os);

  return (
    <div className={`${styles.notice} not-prose`} role="note">
      <Icon icon="ph:funnel-simple" width={16} aria-hidden="true" />
      <span className={styles.noticeText}>
        {!state
          ? 'This page has platform-specific steps.'
          : filtered
            ? (
                <>
                  Showing steps for <strong>{platformStateLabel(state)}</strong>
                  {state.source === 'detected' ? ' (detected).' : '.'}
                </>
              )
            : 'Showing steps for every platform.'}
      </span>
      <PlatformMenu variant="inline" triggerLabel={filtered ? 'Change' : 'Choose yours'} />
      {filtered && (
        <button type="button" className={styles.inlineTrigger} onClick={() => setPlatform('all')}>
          Show all
        </button>
      )}
    </div>
  );
}

'use client';

import { Icon } from '@iconify/react';
import { Popover, PopoverContent, PopoverTrigger } from 'fumadocs-ui/components/ui/popover';
import { ChevronDown } from 'lucide-react';
import { useEffect, useState } from 'react';
import { docsPlatforms, platformOsLabels, type PlatformOs } from '@/lib/platforms';
import { refineDetectedPlatform, setPlatform, usePlatform, type PlatformState } from '@/lib/platform-store';
import styles from './platform.module.css';

const osIcons: Record<PlatformOs, string> = {
  macos: 'ph:apple-logo',
  linux: 'ph:linux-logo',
  windows: 'ph:windows-logo',
};
const allIcon = 'ph:devices';

/** What the reader is seeing, e.g. "macOS (Apple Silicon)", "macOS", "All platforms". */
export function platformStateLabel(state: PlatformState | null): string {
  if (!state) return 'Platform';
  if (state.platform) return docsPlatforms.find(({ id }) => id === state.platform)?.label ?? state.platform;
  if (state.os) return platformOsLabels[state.os as PlatformOs] ?? state.os;
  return 'All platforms';
}

function stateIcon(state: PlatformState | null): string {
  return state?.os ? (osIcons[state.os as PlatformOs] ?? allIcon) : allIcon;
}

// The radio value that matches the current state.
function selectedValue(state: PlatformState | null): string {
  return state?.platform ?? state?.os ?? 'all';
}

const groups = (Object.keys(platformOsLabels) as PlatformOs[]).map((os) => ({
  os,
  platforms: docsPlatforms.filter((platform) => platform.os === os),
}));

/**
 * Platform picker. `sidebar` is the full-width control in the sidebar footer;
 * `inline` is the compact trigger in a page's platform notice.
 */
export function PlatformMenu({ variant, triggerLabel }: { variant: 'sidebar' | 'inline'; triggerLabel?: string }) {
  const state = usePlatform();
  const [open, setOpen] = useState(false);
  const selected = selectedValue(state);

  // One instance per layout narrows a detected Mac to its chip.
  useEffect(() => {
    if (variant === 'sidebar') void refineDetectedPlatform();
  }, [variant]);

  function choose(value: string) {
    setPlatform(value);
    setOpen(false);
  }

  const option = (value: string, label: string, icon?: string) => (
    <label key={value} className={styles.option}>
      <input
        type="radio"
        name={`platform-${variant}`}
        value={value}
        checked={selected === value}
        onChange={() => choose(value)}
      />
      {icon ? <Icon icon={icon} width={16} aria-hidden="true" /> : <span className={styles.optionIndent} aria-hidden="true" />}
      <span>{label}</span>
    </label>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={variant === 'sidebar' ? styles.sidebarTrigger : styles.inlineTrigger}
        aria-label={`Platform: ${platformStateLabel(state)}. Change platform`}
      >
        {variant === 'sidebar' ? (
          <>
            <Icon icon={stateIcon(state)} width={16} aria-hidden="true" />
            <span className={styles.triggerText}>{platformStateLabel(state)}</span>
            {state?.source === 'detected' && <span className={styles.detected}>Detected</span>}
            <ChevronDown className={styles.chevron} aria-hidden="true" />
          </>
        ) : (
          <>
            {triggerLabel ?? 'Change'}
            <ChevronDown className={styles.chevron} aria-hidden="true" />
          </>
        )}
      </PopoverTrigger>
      <PopoverContent align={variant === 'sidebar' ? 'start' : 'center'} side={variant === 'sidebar' ? 'top' : 'bottom'} className={styles.menu}>
        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>Show steps for</legend>
          {option('all', 'All platforms', allIcon)}
          {groups.map(({ os, platforms }) => (
            <div key={os} className={styles.group} role="group" aria-label={platformOsLabels[os]}>
              <p className={styles.groupLabel}>
                <Icon icon={osIcons[os]} width={16} aria-hidden="true" />
                {platformOsLabels[os]}
              </p>
              {platforms.map(({ id, label }) => option(id, label.replace(/^[^(]*\(|\)$/g, '')))}
            </div>
          ))}
        </fieldset>
        <p className={styles.hint}>Using WSL2? Choose Linux.</p>
      </PopoverContent>
    </Popover>
  );
}

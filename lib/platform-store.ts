import { useSyncExternalStore } from 'react';
import { bootPlatform } from '@/lib/platform-filter.mjs';
import { platformConfig } from '@/lib/platforms';

// The reader's platform lives on <html> (data-platform, data-platform-os,
// data-platform-source), set before first paint by the inline boot script.
// This store reads those attributes and changes them; CSS does the hiding.

export type PlatformSource = 'link' | 'saved' | 'detected' | 'default';

export interface PlatformState {
  platform: string | null;
  os: string | null;
  source: PlatformSource;
}

const CHANGE_EVENT = 'coven-docs:platform-change';

function snapshot(): string {
  const { platform = '', platformOs = '', platformSource = 'default' } = document.documentElement.dataset;
  return `${platform}|${platformOs}|${platformSource}`;
}

function subscribe(onChange: () => void) {
  // Another tab saved a choice: resolve again from storage.
  function onStorage(event: StorageEvent) {
    if (event.key !== platformConfig.storageKey) return;
    bootPlatform(platformConfig);
    onChange();
  }
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener('storage', onStorage);
  };
}

/** The current platform, or null while rendering on the server. */
export function usePlatform(): PlatformState | null {
  const value = useSyncExternalStore(subscribe, snapshot, () => '');
  if (value === '') return null;
  const [platform, os, source] = value.split('|');
  return { platform: platform || null, os: os || null, source: source as PlatformSource };
}

/** Save a choice (`all`, an OS family, or a platform id) and apply it. */
export function setPlatform(value: string) {
  try {
    localStorage.setItem(platformConfig.storageKey, value);
  } catch {
    // Storage can be blocked; the choice still applies to this page.
  }
  // A ?platform= link outranks the saved choice, so drop it once the reader picks.
  const url = new URL(window.location.href);
  if (url.searchParams.has(platformConfig.param)) {
    url.searchParams.delete(platformConfig.param);
    window.history.replaceState(window.history.state, '', url);
  }
  // Apply the value itself rather than re-reading storage, which may be blocked.
  const root = document.documentElement;
  const platform = platformConfig.platforms.includes(value) ? value : null;
  const os = platform ? platform.split('-')[0] : platformConfig.oses.includes(value) ? value : null;
  if (platform) root.setAttribute('data-platform', platform);
  else root.removeAttribute('data-platform');
  if (os) root.setAttribute('data-platform-os', os);
  else root.removeAttribute('data-platform-os');
  root.setAttribute('data-platform-source', 'saved');
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

interface UserAgentHints {
  getHighEntropyValues(keys: string[]): Promise<{ architecture?: string }>;
}

/**
 * The inline script cannot wait for Chromium's CPU hint, so a detected Mac
 * starts as plain "macOS". Narrow it to the chip once the hint arrives.
 */
export async function refineDetectedPlatform() {
  const root = document.documentElement;
  const detectedMac = () =>
    root.dataset.platformSource === 'detected' && root.dataset.platformOs === 'macos' && !root.dataset.platform;
  const hints = (navigator as Navigator & { userAgentData?: UserAgentHints }).userAgentData;
  if (!detectedMac() || !hints) return;
  try {
    const { architecture } = await hints.getHighEntropyValues(['architecture']);
    const id = architecture === 'arm' ? 'macos-arm64' : architecture === 'x86' ? 'macos-x64' : null;
    if (!id || !platformConfig.platforms.includes(id) || !detectedMac()) return;
    root.setAttribute('data-platform', id);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    // No hint: keep showing both Mac variants.
  }
}

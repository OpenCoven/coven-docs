import data from '@/content/data/platforms.json';
import { parsePlatformTokens, platformBootScript, platformCss } from '@/lib/platform-filter.mjs';

// The platforms readers can filter by, from content/data/platforms.json
// (derived from upstream; see content/data/README.md).

export type PlatformOs = 'macos' | 'linux' | 'windows';

export interface DocsPlatform {
  id: string;
  os: PlatformOs;
  label: string;
}

export const platformOsLabels: Record<PlatformOs, string> = {
  macos: 'macOS',
  linux: 'Linux',
  windows: 'Windows',
};

export const docsPlatforms: DocsPlatform[] = data.platforms.map(({ id, os, label }) => ({
  id,
  os: os as PlatformOs,
  label,
}));

const platformIds = docsPlatforms.map(({ id }) => id);

export const platformConfig = {
  param: 'platform',
  storageKey: 'coven-docs:platform',
  platforms: platformIds,
  oses: Object.keys(platformOsLabels),
};

export const platformHeadScript = platformBootScript(platformConfig);
export const platformHeadStyle = platformCss(platformIds);

export function platformTokens(only: string): string[] {
  return parsePlatformTokens(only, platformIds);
}

/** "macOS · Linux", "Windows (x64)", and so on. */
export function platformTokensLabel(tokens: string[]): string {
  return tokens
    .map((token) => platformOsLabels[token as PlatformOs] ?? docsPlatforms.find(({ id }) => id === token)?.label ?? token)
    .join(' · ');
}

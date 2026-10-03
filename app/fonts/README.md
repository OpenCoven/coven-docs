# Self-hosted documentation fonts

The site bundles Inter 4.001, EB Garamond 1.003 (normal and italic), and
JetBrains Mono 2.211. Builds read these files locally; they do not download
fonts from Google.

The 27 WOFF2 files are unchanged copies of the subsets previously served by
`next/font/google`. `manifest.json` records each immutable Google font URL,
SHA-256, byte count, weight range, style, and Unicode range. The four Latin
files total 180,908 bytes and are preloaded by `next/font/local` in
`app/layout.tsx`. `extended.css` supplies the other subsets on demand and
preserves the previous Next.js 16.3.3 fallback metrics.

The body, display, and code stacks expose `--font-inter`, `--font-eb-garamond`,
and `--font-jetbrains-mono`, matching the [OpenCoven typography contract](https://github.com/OpenCoven/coven/blob/eb3273e19670d2ab5bf1374783d96c11a50b0be2/brand/ui/typography.css).
The extended faces precede the metric-adjusted system fallback in each stack
so Greek, Cyrillic, and other supported characters use the same family.

## Licenses and sources

Keep the complete SIL Open Font License 1.1 notices with the files:

- Inter: `inter-OFL.txt`; [upstream source](https://github.com/google/fonts/tree/9710da1eacb3be272583c3224dcb70f9da6eadbb/ofl/inter).
- EB Garamond: `ebgaramond-OFL.txt`; [upstream source](https://github.com/google/fonts/tree/9710da1eacb3be272583c3224dcb70f9da6eadbb/ofl/ebgaramond).
- JetBrains Mono: `jetbrainsmono-OFL.txt`; [upstream source](https://github.com/google/fonts/tree/9710da1eacb3be272583c3224dcb70f9da6eadbb/ofl/jetbrainsmono).

## Updating the fonts

Fetch the CSS requests in `manifest.json` with its recorded user agent to
inspect the provider's WOFF2 subsets. Review any changed font version, then
update the binaries, provenance, licenses, Unicode ranges, and fallback
metrics together. Preserve the four Latin preloads and verify that extended
characters load their subsets on demand.

Run `pnpm verify`, inspect the desktop and mobile browser evidence, and test a
clean `pnpm build:site` with outbound networking disabled and dependencies
already installed. Source-freshness checks and dependency installation still
need network access; the offline assertion applies to the site build.

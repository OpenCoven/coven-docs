# Coven Documentation

Documentation site for the Coven project, built with [Fumadocs](https://fumadocs.dev).

## Getting Started

```bash
pnpm install
pnpm dev
```

Visit `http://localhost:3000` in your browser.

## Structure

- `app/` - Next.js App Router documentation site
- `content/docs/` - MDX documentation, organized by section (each folder has a `meta.json`)
- `components/` - React components used in the docs (e.g. `Mermaid`, data tables)
- `scripts/` - build and validation scripts (docs conventions, Mermaid, OpenAPI)
- `openapi/` - OpenAPI specs rendered into `content/docs/openapi/`

## Building

```bash
pnpm build
```

The build also runs the docs checks (English-only, no leading H1, per-section
docs conventions, and Mermaid validation) before `next build`, so a broken
diagram or convention violation fails the build.

## Git hooks

Hooks are tracked in [`.githooks/`](.githooks/README.md) and shared across
clones. `pnpm install` activates them via the `prepare` script
(`git config core.hooksPath .githooks`); to enable without a full install, run
that command once.

- **`pre-commit`** — scans staged files for secrets with `gitleaks` (skips with
  a warning if gitleaks is not installed; allow-list false positives in
  `.gitleaks.toml`).
- **`pre-push`** — runs `pnpm run check:mermaid` when the push touches `.mdx` or
  Mermaid tooling, blocking on invalid diagram syntax.

Emergency bypass (avoid): `git commit --no-verify` / `git push --no-verify`.

## Deployment

Deploy to Vercel or your preferred hosting.

# Coven Documentation

Documentation site for the Coven project, built with [Fumadocs](https://fumadocs.dev).

## Getting Started

```bash
pnpm install
pnpm dev
```

Visit `http://localhost:3000` in your browser.

## Structure

- `apps/docs/` - Next.js documentation site
- `apps/docs/content/` - Markdown documentation files

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

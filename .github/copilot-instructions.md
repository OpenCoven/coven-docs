---
applyTo: "**"
---

# coven-docs

Fumadocs documentation site for the Coven project.

## Setup

```bash
pnpm install
pnpm dev
```

## Structure

- `app/` — Next.js App Router documentation site
- `content/docs/` — MDX documentation, organized by section (each folder has a `meta.json`)
- `components/` — React components used in the docs (e.g. `Mermaid`, data tables)
- `lib/` — Fumadocs source loader and shared utilities
- `scripts/` — build and validation scripts (docs conventions, Mermaid, OpenAPI)
- `openapi/` — OpenAPI specs rendered into `content/docs/openapi/`

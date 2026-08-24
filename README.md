# Coven Documentation

Canonical public documentation for the Coven runtime, CLI, daemon, harness
integrations, supported local API, and their operational and security
contracts. The site is built with Next.js and Fumadocs.

The repository intentionally does **not** duplicate the complete manuals for
Cave, Psyche, Psyche Build, Threads, or other neighboring OpenCoven products.
Their owning repositories remain authoritative; the
[ecosystem guide](content/docs/guide/ecosystem.mdx) explains the boundary.

## Local development

Requirements:

- Node.js 22.6 or newer
- pnpm 10.33.2
- Git

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Open `http://localhost:3000`.

## Verification

Run the same release-quality contract used by repository CI:

```bash
pnpm verify
```

`verify` performs:

1. JavaScript automation syntax validation;
2. deterministic OpenAPI generation and drift detection;
3. TypeScript checking;
4. the declarative site-manifest, source-lock, product-scope, section, MDX, and
   Mermaid checks;
5. internal route and heading-fragment validation;
6. API simulator tests;
7. a production Next.js build;
8. Chromium smoke coverage for primary pages, mobile overflow, exports,
   canonical metadata, deployment headers, and redirects.

Use narrower commands while iterating:

```bash
pnpm check:content
pnpm check:links
pnpm check:anchors
pnpm check:generated
pnpm build:site
pnpm test:smoke
```

## Repository structure

- `app/` — Next.js App Router site and export routes
- `content/docs/` — public MDX documentation and section navigation
- `components/` — Fumadocs and interactive documentation components
- `docs/site-manifest.json` — canonical section order, ownership, stability,
  search classification, redirects, and retired surfaces
- `docs/source-lock.json` — path-scoped upstream verification boundaries
- `docs/adr/` — documentation architecture decisions
- `docs/freshness.md` — production and upstream freshness contract
- `docs/release-runbook.md` — deployment and rollback procedure
- `openapi/` — source daemon OpenAPI contract
- `scripts/` — content, generation, link, freshness, and browser certification checks
- `.github/workflows/docs.yml` — repository-owned release verification
- `.github/workflows/docs-live.yml` — hourly production health and deployment freshness
- `.github/workflows/docs-source-drift.yml` — daily upstream contract-drift detection

## Generated contracts

`openapi/coven.daemon.v1.yaml` is the committed source for the stable public API
subset. `pnpm openapi:build` injects code samples and regenerates endpoint MDX.
Generated endpoint changes must be committed; `pnpm check:generated` fails when
the source and committed pages drift.

Narrative explanations remain authored. Machine generation owns operation
inventory, signatures, schemas, and examples—not product interpretation.

## Stability, ownership, and freshness

Every top-level section is classified as `stable`, `preview`, or
`experimental` in `docs/site-manifest.json`. The page header renders that
classification and links to the repository that owns the underlying facts.

Changes to runtime behavior must be verified against the owning source
repository before merging. Path-scoped source watches open a review issue when
those contracts move after the timestamp in `docs/source-lock.json`. See
[the freshness contract](docs/freshness.md) and [CONTRIBUTING.md](CONTRIBUTING.md).

## Git hooks

Hooks are tracked in [`.githooks/`](.githooks/README.md). `pnpm install`
activates them through `core.hooksPath`:

- `pre-commit` scans staged changes with Gitleaks when installed.
- `pre-push` selects content, link, anchor, generated-contract, Mermaid, and type checks from the files being pushed.

Emergency bypasses (`--no-verify`) should be reserved for recovery and must not
replace CI.

## Deployment

Vercel runs `pnpm build`. GitHub Actions runs the stronger `pnpm verify`
contract. The hourly live workflow then proves production serves the intended
commit and primary routes. A release is complete only when repository CI is
green, production points at the intended commit, and no unresolved source-drift
incident exists. See [the release runbook](docs/release-runbook.md).

# Documentation certification contract

A Coven release is documented only when the human journey, machine contracts,
and deployed site agree.

## Repository-owned evidence

`pnpm verify` certifies:

- automation syntax and freshness-lock integrity;
- manifest and information-architecture integrity;
- CLI and section coverage currently represented in this repository;
- generated OpenAPI freshness;
- TypeScript and production build correctness;
- internal routes and heading fragments;
- Mermaid parsing;
- API simulator behavior;
- primary desktop and mobile browser routes;
- one-H1 and one-main landmark structure;
- stability and contract-source page chrome;
- baseline deployment security headers;
- canonical metadata, exports, sitemap, robots, and redirects.

The browser job uploads machine-readable results and desktop/mobile screenshots
for the homepage, docs portal, and first-session journey. Those artifacts are
release evidence, not a replacement for review of intentional visual changes.

## Live and source freshness

Repository correctness does not prove the public deployment is current.

- `.github/workflows/docs-live.yml` verifies the production commit and primary
  routes after every merge and every hour.
- `.github/workflows/docs-source-drift.yml` checks path-scoped upstream contract
  sources daily against `docs/source-lock.json`.
- Failed checks open one durable incident issue and attach JSON evidence; a
  recovered check closes the incident automatically.

## Cross-repository evidence still required

The owning runtime repository must eventually publish:

- a deterministic CLI help and stability artifact;
- a pinned stable daemon API artifact;
- packaged-CLI first-session tests;
- release metadata that identifies the contract versions consumed here.

When those artifacts are available, `coven-docs` should import them at a pinned
commit or release and fail CI when a stable public command or operation lacks a
canonical documentation route.

## Certification rule

A preview deployment is not release evidence by itself. Certification requires
repository CI, browser and visual artifacts, deployment attribution, a passing
production smoke, and no unresolved upstream source-drift incident.

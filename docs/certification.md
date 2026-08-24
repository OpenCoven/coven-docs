# Documentation certification contract

A Coven release is documented only when the human journey, machine contracts,
and deployed site agree.

## Repository-owned evidence

`pnpm verify` certifies:

- manifest and information-architecture integrity;
- CLI and section coverage currently represented in this repository;
- generated OpenAPI freshness;
- TypeScript and production build correctness;
- internal routes and heading fragments;
- Mermaid parsing;
- API simulator behavior;
- primary desktop and mobile browser routes;
- canonical metadata, exports, sitemap, robots, and redirects.

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
repository CI, deployment attribution, and the target production route smoke.

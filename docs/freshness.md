# Documentation freshness contract

Coven documentation is considered current only when both release surfaces hold:

1. **Deployment freshness** — `https://docs.opencoven.ai/build.txt` and the
   `x-coven-docs-commit` response header identify the current `main` commit, and
   primary public routes, exports, redirects, and metadata respond correctly.
2. **Source freshness** — files that own documented runtime facts have not
   changed after the verification boundary recorded in
   [`source-lock.json`](source-lock.json).

## Production verification

`.github/workflows/docs-live.yml` runs after every push to `main`, every hour,
and on demand. It polls through the normal Vercel deployment window, then checks:

- deployment commit attribution;
- the homepage and canonical first-session, troubleshooting, and API routes;
- `llms.txt`, `sitemap.xml`, and response headers;
- consistency between `/build.txt` and page headers.

A failure opens or updates one incident issue and attaches a machine-readable
report. Recovery closes that issue automatically after the live contract passes.

## Upstream source verification

`.github/workflows/docs-source-drift.yml` runs daily and queries GitHub for
changes to the path-scoped runtime sources listed in `source-lock.json`.
Changing an upstream source does not automatically rewrite prose. It creates a
review obligation:

1. inspect the implementation, tests, or normative contract;
2. update every affected public page and generated contract;
3. run `pnpm verify`;
4. advance `verifiedAt` and `verifiedCommit` only after the review is complete.

This intentionally prefers a visible stale warning over silently assuming that
old documentation still describes a newer runtime.

## Adding a source

Add a source when a public section makes behavior claims owned outside this
repository. Keep watches narrow and path-specific so unrelated repository work
does not create noise. Every source entry requires:

- an immutable verification commit;
- an ISO-8601 verification timestamp later than that commit;
- the public section slugs affected by drift;
- exact paths whose changes require documentation review.

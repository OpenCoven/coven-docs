# Bounded automation authority review — 2026-09-28

Related: OpenCoven/coven#857 and coven-docs#89.

This is a partial review, not a global source-freshness receipt. The public page
explicitly describes forthcoming hardening and does not claim deployed release
coverage.

Reviewed source: OpenCoven/coven commit
`b5b81c7e556a25c2b313b5898d0c5c23d1b90f23`:

- `crates/coven-cli/src/api.rs`: action transport gate before store access.
- `crates/coven-cli/src/request_authority.rs`: owner-local mutation predicate.
- `crates/coven-cli/src/control_plane.rs`: read allowlist, typed refusal, legacy routes.
- `crates/coven-cli/src/automations/transport_authority_tests.rs`: request-handler
  refusal, adoption-key non-consumption, replay rejection, and read compatibility.
- `docs/API-CONTRACT.md`: bounded transport contract and remaining execution gates.

The four new request-handler regressions and existing control-action tests passed
in producer Actions run 36395030132; the workspace test step also passed. That run
was not wholly green: a temporary patch scaffold tripped the secret scanner and
Clippy rejected test-name prefixes. Neither failure should be hidden or used to
claim release acceptance. The clean producer PR must retain the normal gates.

Unreviewed source drift remains in the September 27 #89 report: main.rs,
api.rs outside this narrow gate, harness.rs, setup/mod.rs, setup/process.rs, and
other API-CONTRACT.md changes. The report's 100 api.rs commits are not a complete
replacement for a source-to-source review.

`docs/source-lock.json` and its verification timestamp are intentionally unchanged.
Do not close #89 or disable its workflow on this evidence. Finish the remaining
path-scoped review, update affected pages and generated contracts, run the full
`pnpm verify`, and only then advance the immutable source verification boundary.

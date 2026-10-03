# Independent browser evidence and source freshness

## Why these checks are separate

Docs run `34664876044`, job `103474663562`, installed dependencies successfully
but failed source freshness before Chrome installation or `pnpm verify`.
That result did not establish a browser regression in the dependency PR.
The upstream drift incident remains #89, not a waiver for application tests.

The Docs workflow now runs two independent jobs:

- `freshness` validates the source lock and compares watched source identities.
- `browser` runs the frozen install, Chrome installation, complete `pnpm verify`,
  and the existing clean-generated-tree check.

The final `verify` job retains the check name **Verify documentation release**.
It runs even after either dependency fails and accepts only two literal
`success` results. Missing, skipped, cancelled, pending, and failed results all
fail. There is no continue-on-error path, new test quarantine, or release waiver.
A green browser job alone does not authorize publication or clear #89.

## Exact snapshot drift semantics

A review timestamp is metadata, not a Git history boundary. A commit written
before review can be merged afterwards. Re-reading `main` for each path can
also combine different source revisions in one report.

The detector resolves the watched ref once, verifies that the reviewed commit
is its ancestor, and compares each watched path's identity in the two pinned
Git trees. The report contains the actual `refCommit`, both path identities,
and `verificationMode: git-tree-identity`. The `changes` array is a snapshot
comparison receipt, not an exhaustive commit chronology. Review the linked
exact-commit comparison and affected source before updating public claims.

Mode, object type, blob/tree SHA, additions, deletions, and ancestor symlink
replacements are significant. Watched directories compare their tree identity.
Unrelated changes outside watched paths do not create drift. A path restored to
exactly its reviewed identity is unchanged for current documentation purposes;
this check is not an audit of all historical changes or deployed behavior.

The detector does not use the capped comparison file list or date-filtered
commit pages. It traverses non-recursive trees, caches repeated reads, and
refuses incomplete/truncated trees, malformed identities, unproven ancestry,
and paths absent from both snapshots. API denial or incomplete evidence is a
failure, never an empty successful inventory. Raw API error bodies are not
copied to public evidence.

## Evidence locations and verification

The Docs workflow retains separate artifacts:

- `docs-source-drift-<run-id>`: `docs-source-drift.json`.
- `docs-certification-<run-id>`: browser/visual evidence under `docs-smoke/`.

The scheduled drift workflow retains its existing incident behavior and uses
the same detector. `pnpm verify` also runs the dependency-free automation tests
through `check:automation`.

```sh
node --test scripts/check-source-drift.test.mjs scripts/docs-release-gate.test.mjs
pnpm verify
```

The focused suite executes the detector CLI with fixture-controlled GitHub
responses, not live network or deployed data. The gate suite exercises every
pairing of seven job outcomes and verifies the workflow dependency graph.

## Source review remains a separate requirement

A successful comparison proves only that the watched paths match the reviewed
source lock. It does not establish that the public pages were reviewed correctly
or that an installed release contains the source changes. Review affected source
and public pages before advancing `verifiedCommit` or `verifiedAt`; retain the
release qualification on those pages.

The source review originally tracked by #89 was reconciled on main, including
#109 and #115. This workflow change preserves that reviewed lock and does not
waive future drift or certify a live deployment.

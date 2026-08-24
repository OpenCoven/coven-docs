# Documentation quality signals

The docs program should use the minimum telemetry necessary to find reader
friction without collecting document contents, prompts, daemon responses,
provider credentials, or local file paths.

## Current event

`docs_page_feedback` records:

- canonical page route;
- `helpful: true|false`.

A negative response also opens a prefilled GitHub issue so the reader can
explain what was unclear. The analytics event is a directional signal, not a
substitute for the issue or source verification.

## Recommended release report

Track per release:

| Signal | Question |
| --- | --- |
| First-session route completion | Can readers traverse the canonical onboarding path? |
| Search zero-result rate | Which terms are not discoverable? |
| Troubleshooting exits | Which recovery branches remain unresolved? |
| Helpful ratio by page | Which pages require focused revision? |
| Stable CLI/API coverage | Does each stable contract element map to a canonical route? |
| Stale verification count | Which contract-sensitive pages lag their owning source? |
| Broken route/anchor count | Is the information architecture structurally sound? |
| Production commit | Does the live site match the intended release? |

Do not report a metric as complete when the requested time window or deployment
is only partially covered.

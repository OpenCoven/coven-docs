# Source review for dependency PR release checks

Reviewed `OpenCoven/coven` from `24445c964c6b15a01ff73ec803512988b6d8fac0` through `16847827f8629a8d7421777f72183ccff660cccf` to resolve the source-freshness failure shared by Dependabot PRs #162, #165, #168, and #170–#174. This is a review of documentation facts and pinned inputs; it does not certify upstream Runtime Authority, production execution, or a Coven release.

## Changed source groups

| Watched sources | Documentation outcome |
| --- | --- |
| `main.rs`, `control_plane.rs`, `docs/API-CONTRACT.md` | Added owner-local automation diagnostics, mission discovery and no-launch M0 behavior, familiar creation, device introduction policy, main-session event/transcript/compaction/notices, and hub summary delivery. Confirmed the advertised action list contains 43 entries and preserves the five-action TCP read allowlist. |
| `automations/definition.rs`, `command_envelope.rs`, `command_matrix.rs`, `command_adoption.rs`, `store.rs`, `runs.rs` | Documented the sole supported main-session output target, rich delivery projection, newly routed run controls, and mission definition isolation. Caller origin remains metadata; missions receive transport-bound principal authority. |
| `automations/occurrences.rs`, `runner.rs`, `recovery.rs`, `daemon_tick.rs` | Documented observations separately from scheduler fences, bounded explanation of claim holds, and terminal-evidence settlement after an ambiguous stop. Recovery still respects pending cancellation, live attempts, deadlines, and unavailable Runtime Authority. Held failed attempts remain retryable through restart; no ambiguous attempt is automatically retried. |
| `spec/coven-automations/v1/state-machines.json`, `docs/architecture/coven-automations-v1.md` | Refreshed the normative machine snapshot for `terminal_evidence_after_ambiguous_stop`, updated delivery and command-envelope statements, and retained the distinction between a proposed contract and certified behavior. Import documentation already distinguishes the two implementations and duplicate-id outcomes. |
| `conformance/automations/runner/inventory.json`, `crates/coven-cli/tests/automations_conformance.rs` | Refreshed the rendered inventory for mission, storage/transaction, result-delivery, and process-crash suites. Expanded suites are upstream audit evidence, not a release or full-profile certification. |
| `Cargo.toml`, `automations/contract/migration.rs`, `mobile_memory/device.rs` | Refreshed the compiled Threads dependency pin; remaining changes expose shared helpers or update dependency APIs and SQLite diagnostic features. The migration profile name and device grant semantics remain unchanged. |
| `api.rs`, `store.rs`, `ward_audit_census.rs` | Reviewed proposal preflight extraction, durable authority writes, main-session protection, and real-directory publication bookkeeping. Existing public ownership and no-authority-from-observation statements remain applicable; no broader filesystem disposal or authority proof is claimed. |
| `engine.rs`, `setup/process.rs`, `scripts/publish-npm.mjs` | Engine probes now bound output/time and contain descendants; provider login hands over and restores the foreground terminal. Publishing checks supported release lines and package surfaces, and treats registry errors as unknown rather than absence. Platform target mappings remain unchanged; regenerated platform data binds their source blobs to the new pin. |

Newly described behavior owners are added as exact watched files, so later changes to extracted main-session, automation diagnostic/delivery/mission, and device policy modules create a new review obligation.

## Artifact provenance

Built the native CLI from the clean upstream checkout at `16847827f8629a8d7421777f72183ccff660cccf` with `CARGO_TARGET_DIR=/tmp/coven-docs-help-target cargo build --locked -p coven-cli --bin coven`. The binary reports `coven v0.4.10-172-g16847827`. Two `help --all --json` captures were byte-identical; the committed provenance records the output SHA-256 and exact `help.rs` and `main.rs` blob identities. The catalog still lists 44 commands in six groups; newly implemented verbs absent from the upstream catalog are documented without fabricating catalog entries.

Regenerated platform data and all 18 contract snapshots from the immutable pin. Reviewed changes comprise source provenance, the two state-machine transitions, the expanded audit inventory, and the compiled dependency manifest. The reviewed latest release is `v0.4.10`, whose older contract bundles carry no conformance-result attachment.

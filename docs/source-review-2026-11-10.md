# Runtime source review for documentation freshness

This review advances the Coven runtime source pin from
`34a60ab5677ae46c3a03920870aa1b30614a90ce` to
`33b366a7c81093d1e579306e136dc5d3aa7a9179`, the sampled `main` on
2026-11-10. It addresses the source-freshness failure in Docs run
`42632971618`. The review covers the changed watched paths and is not
independent security review, real-device acceptance, or release certification.

## Changed watched paths

| Watched source | Review and documentation outcome |
| --- | --- |
| `crates/coven-cli/src/main.rs`, `docs/API-CONTRACT.md` | Added owner-local direct/relay connection observations and their coarse `offline`, `connecting`, `authenticating`, and `online` states. Documented them in Doctor as diagnostics only; they grant no application authority and expose no identifiers or transport secrets. |
| `crates/coven-cli/src/mobile_memory/owner_policy.rs`, `identity.rs` | Reviewed the updated owner-policy and identity handling alongside the existing dual-signed rotation guidance. Existing claims remain scoped to source-build behavior and do not imply a shipped client. Updated source links to the reviewed pin. |
| `crates/coven-cli/src/mobile_memory/transport/storage.rs`, `gateway/relay_runtime.rs`, `transport/README.md` | Reviewed the v2 counter-based rendezvous, durable protocol floor, direct authenticated handover/recovery, and the unchanged v1 behavior before handover. Updated the relay page with the implementation status and retained the explicit limits on client, device, and independent acceptance. The source README also records that Snow and serialized provisioning/handover copies are not guaranteed to be erased; the page now states this memory limitation. |
| `.github/release-support.json` | The supported package line is now 0.5. GitHub Releases still lists `v0.4.10` as the latest published release, so the existing latest-release statement remains accurate and no unreleased version is presented as available. |
| `crates/coven-cli/Cargo.toml` | Updated the rendered upstream dependency snapshot for `rusqlite` 0.41. The source change is a dependency upgrade; no new runtime behavior is inferred from it. |

The CLI help capture remains the output recorded from source commit
`0637b84c9f8c2028c47f78e87834e750bbb81924`; it has not been relabeled as a
new build. The current `help.rs` blob is unchanged. The reviewed `main.rs`
change adds Doctor diagnostics outside command registration and help
serialization, so the provenance records the distinct captured and reviewed
blobs in `content/data/coven-cli-help.provenance.json`.

## Verification scope

The source lock is pinned to `33b366a7c81093d1e579306e136dc5d3aa7a9179`.
The dependency snapshot and its manifest were refreshed at that pin. Public
guidance continues to distinguish implementation and local fixtures from
released-client, deployed-network, and independent-review evidence.

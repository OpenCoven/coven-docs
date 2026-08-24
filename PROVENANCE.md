# PROVENANCE.md — OpenCoven Origin Record

> This document establishes the timestamped origin of architectural ideas that
> define OpenCoven. It is a public record, not a legal claim, and exists so
> contributors, users, researchers, and examiners can verify provenance.

## Origin

**OpenCoven** was created by **Valentina Alexander** (`@BunsDev`) and first
published publicly on **April 27, 2026** under the MIT License.

- GitHub organization: https://github.com/OpenCoven
- Website: https://OpenCoven.ai
- Discord: https://discord.gg/OpenCoven
- X: https://x.com/OpenCvn
- License: MIT (https://opensource.org/licenses/MIT)
- Repository creation date: **2026-04-27**, verifiable through the GitHub API

The original Coven repository has no fork parent. It is an original work with
no upstream source repository.

## Architectural concepts and origins

### 1. Familiar identity model

**First appeared:** `coven-cli/src/familiar_identity.rs`, commit history from
2026-04-27.

A named, role-scoped agent persona—a familiar—resolved from a configuration
manifest and attached to a session through runtime configuration. The familiar
has a stable identity and role rather than existing only as an interchangeable
prompt.

### 2. Agent spawn harness

**First appeared:** `pty_runner.rs:307`
(`spawn_piped_with_observer`), commit history from 2026-04-27.

A structured dispatch pattern for configured agent and harness processes. It
validates a harness allowlist, canonicalizes the working directory, checks
session state, and routes execution through defined low-level spawn primitives.

### 3. Multi-agent familiar substrate

**First appeared:** OpenCoven core architecture, 2026-04-27.

Composable, purpose-scoped familiars cooperate through structured routing,
share bounded session context, and remain individually manageable. Routing is
explicit and traceable rather than an unowned chain of prompt handoffs.

### 4. Graded approval tier model

**First appeared:** Familiar Contract RFC-0001 v0.2.0, authored by Valentina
Alexander and Sage, dated 2026-06-19.

A protected/editable partition gated by approval tiers:
`auto → familiar_review → human_review → human_required`, enforced by an
authority layer separate from the familiar.

### 5. Session memory and continuity substrate

**First published:** 2026, active development.

Durable, portable agent memory and session state that remain under user control
and preserve provenance. The design is model- and provider-agnostic.

## Third-party acknowledgments

Third-party repositories have independently documented OpenCoven as a source or
ancestor of architectural elements. Those records are supporting provenance,
not endorsement.

| Project | Documentation | Concepts acknowledged |
| --- | --- | --- |
| `YogiSotho/warden` | `lineage/LINEAGE.md`, `docs/ops/patent/prior-art-search.md` | Spawn chokepoint, familiar identity model, harness adapter contract, ledger shape, and CLI skeleton |

## Maintainer

**Valentina Alexander**

- GitHub: [@BunsDev](https://github.com/BunsDev)
- Role: Creator and Core Maintainer, OpenCoven
- Also: Lead Developer Relations Engineer, Ritual Foundation

## Corrections

If you know of prior art that predates a concept listed here, open an issue.
OpenCoven maintains this record honestly and will correct unsupported
originality claims.

If you know of a patent application or trademark filing that cites or conflicts
with documented OpenCoven work, notify maintainers privately or through an
issue that does not disclose confidential material.

---

*Last updated: 2026-08-24*

*This document is not legal advice.*

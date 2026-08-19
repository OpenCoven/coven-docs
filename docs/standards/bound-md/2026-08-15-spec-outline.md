# bound.md / bounds.md — Draft Spec Outline

Status: draft outline, not yet implemented or ratified. Positioning research
completed 2026-08-15 (domain availability + prior-art check). Val reports
`bound.md`/`bounds.md` registration was initiated 2026-08-15; a live whois
recheck the same day still showed both as unregistered ("No entries found"),
likely registry-propagation lag rather than a failed purchase — reconfirm
before treating registration as settled.

## 0. One-line positioning

**AGENTS.md tells an agent how to work. bound.md/bounds.md tells the runtime
what the agent is allowed to touch — and is meant to be machine-enforced,
not advisory.**

## 1. Problem statement

- AGENTS.md (now governed by the Agentic AI Foundation / Linux Foundation)
  is an advisory conventions file: style, workflow, "always/ask/never" as
  prose guidance a model is supposed to follow.
- Nothing in that spec requires a runtime to mechanically enforce those
  boundaries. Enforcement today is bespoke per harness (sandboxes, ACLs,
  per-vendor permission systems) with no shared, portable declaration format.
- Multi-root, multi-agent setups (e.g., this very session: one primary root
  plus ~25 granted project roots, each with its own read-only/read-write
  flag) currently exist only as opaque runtime state, not as a durable,
  inspectable, or version-controllable file.

## 2. Two filenames, two scopes (why both domains matter)

- **`bound.md`** — singular scope: the boundary contract for *one* agent
  instance operating in *one* repo/workspace context. Analogous to a single
  `AGENTS.md`. Lives at a repo or workspace root.
- **`bounds.md`** — plural/fleet scope: a registry describing boundaries for
  *multiple* agents/roots at once (e.g., an orchestrator or control-room app
  declaring what each of N familiars/agents may access). Optional; most
  single-agent projects only need `bound.md`.
- Both parse to the same underlying schema (§4); `bounds.md` is a list of
  named `bound.md`-shaped entries.

## 3. Design principles

1. **Enforceable, not advisory.** A conformant runtime MUST refuse actions
   outside declared bounds; it is a hard boundary layer, positioned below
   AGENTS.md, not a rephrasing of it.
2. **Complementary to AGENTS.md, not competing.** bound.md answers "where/
   what may I touch"; AGENTS.md keeps answering "how should I work." A
   runtime may support one without the other.
3. **Human-readable + machine-parseable.** Markdown body for humans, a
   fenced structured block (YAML/JSON frontmatter or a `bound` code fence)
   for parsers — mirrors how this session's own boundary block already
   reads in practice.
4. **Least surprise over least privilege dogma.** Default-deny is
   recommended but the spec doesn't mandate an enforcement *policy*, only
   the declaration *format* and the requirement that runtimes not silently
   exceed it.
5. **Portable across vendors.** No vendor-specific paths, env vars, or
   process models baked into the core schema.

## 4. Core schema (draft shape)

```yaml
version: 1
subject: <agent-name-or-id>          # who this bound applies to
roots:
  - path: /abs/or/relative/path
    access: read-write | read-only | none
    note: optional human-readable reason
  - path: ...
runtime_resources:                    # non-filesystem capabilities
  - name: shell
    access: read-write | read-only | none
  - name: network
    access: read-write | read-only | none
default: deny                         # deny | inherit-from-parent
conflict_resolution: most-specific-path-wins
extends: ../bound.md                  # optional inheritance
```

`bounds.md` = a top-level list of `subject: {...}` blocks using the same
per-entry shape.

## 5. Semantics to define precisely

- **Precedence**: most-specific path wins vs. most-restrictive-wins — pick
  one default, let it be overridable per-entry.
- **Inheritance**: how a child workspace's `bound.md` composes with a parent
  or org-level `bounds.md`.
- **Revocation/versioning**: bump `version`; runtimes should refuse to
  silently upgrade semantics across major versions.
- **Read-only enforcement scope**: does read-only include shell exec inside
  that path? (Yes, per this session's own convention — worth stating
  explicitly rather than leaving implicit.)
- **Unlisted paths**: default-deny unless `default: inherit-from-parent`.

## 6. Enforcement contract (the part AGENTS.md doesn't have)

- A conformant harness/runtime MUST parse `bound.md`/`bounds.md` at session
  start and MUST reject (not just discourage) filesystem/shell/network
  actions outside the declared roots.
- The spec should define a minimal **conformance test suite** (a few sample
  bound.md files + expected allow/deny outcomes) so multiple vendors can
  claim "bound.md-compliant" the same way tools claim AGENTS.md support.

## 7. Relationship to prior art

- **AGENTS.md** (AAIF/Linux Foundation) — advisory workflow conventions;
  bound.md is a sibling, not a replacement.
- **SPIFFE/SPIRE, capability manifests, OAuth token exchange** — precedent
  for portable, verifiable identity/capability boundaries in distributed
  systems; bound.md borrows the "declare once, enforce everywhere" idea but
  scoped to filesystem/tool access for coding agents specifically.
- **This session's own runtime boundary block** — the closest thing to a
  working reference implementation already in daily use; worth mining for
  the schema's real-world edge cases (read-only project roots, primary root
  vs. granted roots, runtime-resource-only paths).

## 8. Open questions (unresolved — flag, don't fake resolution)

- Single canonical parser/reference implementation, or spec-only (like
  early AGENTS.md)?
- Where does this get proposed — new AAIF project, independent spec with
  later donation, or an OpenCoven-only convention first?
- Should `bounds.md` be scoped to *this* fleet's needs only, or generalized
  enough for any multi-agent orchestrator?
- Governance: who can amend the schema once (if) adopted externally?

## 9. Suggested next steps if pursued

1. Register `bound.md` and `bounds.md` domains — **reported done 2026-08-15,
   pending live-whois reconfirmation** (see status note above).
2. Write a v0 reference parser against this session's own boundary format
   as the first real-world test case.
3. Publish as a standalone spec repo before pitching AAIF — arrive with a
   working implementation, not just a proposal.

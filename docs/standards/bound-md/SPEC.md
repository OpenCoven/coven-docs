# bound.md / bounds.md — v0.1 Standard

Status: **v0.1 draft standard**, proposed for OpenCoven-wide adoption. Supersedes
the positioning research in [`2026-08-15-spec-outline.md`](./2026-08-15-spec-outline.md)
(kept as historical record of the prior-art/positioning pass). This document
resolves the open semantics the outline flagged, adds a conformance test
shape, and — new in this revision — documents a reference implementation
already running in production: Coven Cave's `coven-autoloop` research
pipeline.

## 0. One-line positioning

**AGENTS.md tells an agent how to work. bound.md/bounds.md tells the runtime
what the agent is allowed to touch — and is machine-enforced, not advisory.**

## 1. Problem statement

- AGENTS.md (governed by the Agentic AI Foundation / Linux Foundation) is an
  advisory conventions file: style, workflow, "always/ask/never" as prose
  guidance a model is supposed to follow. Nothing in that spec requires a
  runtime to mechanically enforce it.
- Enforcement today is bespoke per harness (sandboxes, ACLs, per-vendor
  permission systems) with no shared, portable declaration format a human or
  another tool can inspect independent of the harness that wrote it.
- Multi-root, multi-agent setups — one primary root plus N granted project
  roots, each with its own read-only/read-write/none flag — currently exist
  only as opaque runtime state unless a harness happens to print it into a
  session transcript. Nothing about it is durable, diffable, or
  version-controllable on its own.

## 2. Two filenames, two scopes

- **`bound.md`** — singular scope: the boundary contract for *one* agent
  instance operating in *one* repo/workspace context. Analogous to a single
  `AGENTS.md`. Lives at a repo or workspace root.
- **`bounds.md`** — plural/fleet scope: a registry describing boundaries for
  *multiple* agents/roots at once (e.g., an orchestrator or control-room app
  declaring what each of N familiars/agents may access). Optional; most
  single-agent projects only need `bound.md`.
- Both parse to the same underlying schema (§4); `bounds.md` is a list of
  named `bound.md`-shaped entries under one `subjects:` key.

## 3. Design principles

1. **Enforceable, not advisory.** A conformant runtime MUST refuse actions
   outside declared bounds; it is a hard boundary layer, positioned below
   AGENTS.md, not a rephrasing of it.
2. **Complementary to AGENTS.md, not competing.** bound.md answers "where/
   what may I touch"; AGENTS.md keeps answering "how should I work." A
   runtime may support one without the other.
3. **Human-readable + machine-parseable.** Markdown body for humans, a fenced
   structured block (YAML frontmatter or a ` ```bound ` code fence) for
   parsers.
4. **Least surprise over least-privilege dogma.** Default-deny is
   recommended; the spec mandates only the declaration *format* and the
   requirement that runtimes not silently exceed it, not one specific
   enforcement policy.
5. **Portable across vendors.** No vendor-specific paths, env vars, or
   process models in the core schema.
6. **Fail closed on ambiguity.** Any path that cannot be resolved to a real,
   contained location (broken symlink, `realpath` failure, escape via `..`)
   MUST be treated as denied, never as "not yet decided."

## 4. Core schema (v0.1, normative)

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

`bounds.md`:

```yaml
version: 1
subjects:
  - subject: familiar-sage
    roots: [...]
    runtime_resources: [...]
    default: deny
  - subject: familiar-kitty
    roots: [...]
```

Field notes:

- `path` MAY be relative (resolved against the file's own directory) or
  absolute. A conformant parser MUST resolve it to a canonical real path
  (following symlinks) before evaluating any request against it — see §6.
- `access: none` is meaningful and distinct from omission: it lets a bound
  file explicitly carve an excluded sub-path out of a broader `read-write`
  ancestor (e.g., a secrets directory inside an otherwise writable repo).
- `runtime_resources` covers capabilities that are not filesystem paths
  (shell execution, outbound network, a specific MCP tool). `read-only` on
  `shell` means "may run inspection commands, may not mutate state" — the
  runtime defines its own inspection/mutation split and MUST document it.

## 5. Semantics (resolved)

- **Precedence: most-specific path wins**, not most-restrictive. A
  `read-only` root with a nested `read-write` sub-path grants write access
  under that sub-path only. This matches how every inspected multi-root
  session boundary in production actually behaves (narrower grant overrides
  broader default) and is less surprising for the common "read-only parent,
  one writable subdirectory" case. `most-restrictive-wins` remains available
  as an explicit `conflict_resolution: most-restrictive` override for
  security-sensitive deployments that want the opposite default.
- **Inheritance**: `extends: <path>` merges the referenced file's `roots`
  and `runtime_resources` as a lower-precedence base; the extending file's
  own entries win on conflict per the precedence rule above. Cycles in
  `extends` MUST be rejected at parse time, not resolved silently.
- **Revocation/versioning**: `version` is a single integer. A runtime MUST
  refuse to load a `bound.md`/`bounds.md` whose `version` is higher than
  the highest version it implements, rather than guessing at forward
  compatibility. Minor semantic clarifications may ship without a version
  bump; any change to the *meaning* of an existing field requires one.
- **Read-only enforcement scope**: `read-only` on a filesystem root
  includes shell execution rooted in that path — a runtime MUST NOT allow
  `cd <read-only-root> && rm file` merely because the mutating step is a
  shell command rather than a direct filesystem write call. This was left
  implicit in the v0 outline; v0.1 states it as a hard requirement because
  it is exactly the gap a shell-capable agent would otherwise find first.
- **Unlisted paths**: default-deny unless the file sets
  `default: inherit-from-parent`, in which case an unlisted path resolves
  against the nearest enclosing `bound.md`/`bounds.md` (if any) and then to
  deny.

## 6. Enforcement contract

- A conformant harness/runtime MUST parse `bound.md`/`bounds.md` at session
  start and MUST reject — not just discourage — filesystem/shell/network
  actions outside the declared roots.
- Path resolution MUST use the real, symlink-resolved path for both the
  declared root and the requested target before the containment check, and
  MUST treat any resolution failure as denied (§3.6). A prefix string
  comparison on unresolved paths is not conformant — it is defeated by a
  symlink or a `..` segment.
- A minimal **conformance test suite** ships alongside this spec: a small
  set of sample `bound.md` files plus expected allow/deny outcomes per
  request, so independent implementations can claim "bound.md-conformant"
  the way tools claim AGENTS.md support today. See §8 for the first
  concrete case, drawn from a running implementation rather than a
  hypothetical.

## 7. Reference implementation: `coven-autoloop`

The clearest existing evidence that this schema is implementable — not just
plausible — is Coven Cave's autonomous research pipeline, internally called
`coven-autoloop` (source: `research-autoloop` in
[`OpenCoven/coven-cave`](https://github.com/OpenCoven/coven-cave), primarily
`src/lib/server/research-autoloop.ts`). It already enforces exactly the
containment semantics this spec describes, for a real multi-root, read-only
capability set, in shipped code:

```ts
async function readBoundedWithinRoot(
  filePath: string,
  allowedRoot: string,
  maxBytes: number,
): Promise<string | null> {
  try {
    const [realRoot, realTarget] = await Promise.all([
      realpath(allowedRoot),
      realpath(filePath),
    ]);
    if (!isWithinRoot(realTarget, realRoot)) return null;
    const info = await stat(realTarget);
    if (!info.isFile() || info.size > maxBytes) return null;
    return await readFile(realTarget, "utf8");
  } catch {
    return null;
  }
}
```

Mapped onto the §4 schema, the autoloop's implicit bound is equivalent to:

```yaml
version: 1
subject: coven-cave-research-library-reader
roots:
  - path: ~/.coven/research/autoresearch/results.tsv
    access: read-only
    note: ledger row source; bounded to its own directory, size-capped
  - path: ~/.coven/logs/autoloop.jsonl
    access: read-only
    note: per-iteration event stream; bounded to its own directory, size-capped
  - path: ~/.coven/research/synthesis
    access: read-only
    note: generated synthesis documents and INDEX.md; recursively bounded
  - path: ~/.coven/research/skills
    access: read-only
    note: staged skill drafts produced by completed research; recursively bounded
default: deny
conflict_resolution: most-specific-path-wins
```

Three properties of this implementation are directly relevant to
ratifying §5–§6 as written, not as aspiration:

1. **Symlink-safe containment** — it resolves both the allowed root and the
   requested target with `realpath` before comparing, then checks
   `target === root || target.startsWith(root + path.sep)`
   (`isWithinRoot`). This is the exact containment check §6 requires, already
   running against untrusted, model-generated path strings (a completion
   event can name an arbitrary `synthesisPath`/`stagedSkillPath`).
2. **Fail-closed on any resolution error** — the `try { … } catch { return
   null; }` shape means a broken symlink, a missing file, or a `..`-escape
   attempt all resolve to "not available" rather than to a guess. This is
   the live version of §3.6.
3. **Size-bounded reads per root** — `MAX_LEDGER_BYTES`, `MAX_EVENT_BYTES`,
   `MAX_INDEX_BYTES`, and `MAX_AUTORESEARCH_DOCUMENT_BYTES` cap what a
   contained-but-oversized file can cost a caller. This is outside the core
   §4 schema (which only declares `access`, not size limits) — it is
   flagged in §9 as a candidate optional field (`max_bytes`) for a future
   minor revision, motivated directly by this implementation rather than
   speculatively.

`coven-autoloop` also demonstrates the schema's boundary: it is entirely
`read-only` and entirely a *reader* of artifacts another process (the
research-mission runner) writes. A `bound.md` for the *writer* side of the
pipeline is a distinct, not-yet-written document — this reference covers
only the read path that Coven Cave's UI exposes today.

## 8. Conformance test suite (v0.1, first case)

A conformant parser/enforcer, given the `coven-autoloop`-derived `bound.md`
in §7 and a workspace where `~/.coven/research/synthesis/report.md` exists
and `~/.coven/research/synthesis/../secrets.md` (i.e.
`~/.coven/research/secrets.md`) also exists:

| Request | Expected result | Why |
|---|---|---|
| Read `~/.coven/research/synthesis/report.md` | allow (read-only) | contained, resolves under the declared root |
| Read `~/.coven/research/synthesis/../secrets.md` | deny | resolves outside the declared root once normalized |
| Write `~/.coven/research/synthesis/report.md` | deny | root is `read-only`, not `read-write` |
| Read `~/.coven/research/synthesis/report.md` via a symlink planted at `~/.coven/research/synthesis/link` pointing outside the root | deny | `realpath` resolution places the real target outside the root |
| Read any path not listed under `roots` | deny | `default: deny` |

Further cases (inheritance via `extends`, `bounds.md` multi-subject
dispatch, version-refusal behavior) are open work — tracked in §9 — and
should be added as companion fixture files once a first reference parser
exists, rather than specified in prose only.

## 9. Open questions (unresolved — flagged, not resolved by assertion)

- Should `max_bytes` (per-root or per-request read-size cap) join the core
  schema in a v0.2, given §7's production evidence that real
  implementations already need it? Leaning yes; not decided.
- Single canonical parser/reference implementation, or spec-only (as early
  AGENTS.md was)? `coven-autoloop`'s TypeScript functions in §7 are a
  candidate seed for an extracted, standalone reference parser, but they
  are currently private implementation details of Coven Cave, not a
  published library.
- Where does this get proposed externally — a new AAIF project, an
  independent spec with later donation, or an OpenCoven-only convention
  first? No decision recorded.
- Should `bounds.md` generalize beyond this fleet's needs, or stay scoped to
  what OpenCoven's own orchestrators require?
- Governance: who can amend the schema once (if) adopted externally?
- Domain registration status for `bound.md`/`bounds.md` (see the outline's
  status note) has not been reconfirmed since 2026-08-15 and should not be
  treated as settled without a fresh check.

## 10. Suggested next steps if pursued

1. Reconfirm `bound.md`/`bounds.md` domain registration status.
2. Extract `coven-autoloop`'s `readBoundedWithinRoot`/`isWithinRoot` pair
   into a small, standalone reference parser + conformance harness, using
   §8's table as its first fixture — this is the fastest path to a working
   implementation rather than a paper spec.
3. Publish as a standalone spec repo before pitching AAIF, arriving with
   that working implementation rather than a proposal alone.

# bound.md / bounds.md — v1.0 Standard

Status: **v1.0 standard**, adopted for OpenCoven-wide use and proposed for
external adoption. Supersedes the v0.1 draft and the positioning research in
[`2026-08-15-spec-outline.md`](./2026-08-15-spec-outline.md) (both kept as
historical record — see "Revision history" at the end of this document). This
revision resolves the v0.1 naming inconsistency around its reference
implementation, adds a second independent production implementation as
corroborating evidence, and closes as many v0.1 open questions as can be
closed honestly rather than by assertion.

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
- **Decision (was open in v0.1):** `bounds.md` stays scoped to what
  OpenCoven's own orchestrators need for v1.0. Generalizing it for arbitrary
  third-party orchestrators is deferred to a v1.1+ proposal once at least one
  external adopter asks for it — speculative generalization without a real
  second consumer tends to guess wrong. This is a decision for *this*
  revision, not a claim that the question is closed forever.

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

## 4. Core schema (v1.0, normative)

```yaml
version: 1
subject: <agent-name-or-id>          # who this bound applies to
roots:
  - path: /abs/or/relative/path
    access: read-write | read-only | none
    note: optional human-readable reason
    max_bytes: optional integer      # OPTIONAL, v1.0: see field notes below
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
- `max_bytes` (per-root, OPTIONAL, new in v1.0) — the maximum size, in bytes,
  a runtime will read from a matching file before refusing the read.
  Resolved (was open in v0.1 §9): added as an **optional** field, not a
  required one, so it does not break v0.1 parsers that ignore unknown keys.
  Motivated directly by production evidence in §7.1 (a shipped implementation
  that already enforces per-root byte caps as an implicit, undeclared
  convention). A runtime that does not implement `max_bytes` MUST ignore it
  rather than error, per the "unknown fields are ignored" parser rule
  implied by this being additive, not a `version` bump.

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
  compatibility. Minor semantic clarifications, and additive optional
  fields such as `max_bytes` (§4), may ship without a version bump; any
  change to the *meaning* of an existing field requires one.
- **Read-only enforcement scope**: `read-only` on a filesystem root
  includes shell execution rooted in that path — a runtime MUST NOT allow
  `cd <read-only-root> && rm file` merely because the mutating step is a
  shell command rather than a direct filesystem write call. This was left
  implicit in the v0 outline; v1.0 states it as a hard requirement because
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
  the way tools claim AGENTS.md support today. See §8, drawn from two
  independent running implementations rather than a hypothetical.

## 7. Reference implementations

**Naming correction (v1.0):** v0.1 of this document called its reference
implementation `coven-autoloop` and cited it as though that were the actual
module name. That name does not exist in the implementation — it comes from
a planning document,
[`coven-cave/docs/research-desk-app-redesign-plan.md`](https://github.com/OpenCoven/coven-cave/blob/main/docs/research-desk-app-redesign-plan.md)
(line 31), which describes a future "`coven-autoloop` skill" that was never
built. No such skill exists in any familiar's skill registry as of this
revision. The real, shipped code is the `research-autoloop` module (path
data conventionally called `autoresearch`) documented in §7.1 below. This
spec now cites implementations by their true names and repository paths, and
flags aspirational/planning names explicitly instead of repeating them as
fact — consistent with treating this as engineering documentation, not
marketing copy.

### 7.1 `research-autoloop` (TypeScript, OpenCoven/coven-cave)

Coven Cave's research-mission reader,
[`src/lib/server/research-autoloop.ts`](https://github.com/OpenCoven/coven-cave/blob/main/src/lib/server/research-autoloop.ts),
already enforces exactly the containment semantics this spec describes, for
a real multi-root, read-only capability set, in shipped code:

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

Mapped onto the §4 schema, its implicit bound is equivalent to:

```yaml
version: 1
subject: coven-cave-research-library-reader
roots:
  - path: ~/.coven/research/autoresearch/results.tsv
    access: read-only
    note: ledger row source; bounded to its own directory, size-capped
    max_bytes: 2097152 # MAX_LEDGER_BYTES
  - path: ~/.coven/logs/autoloop.jsonl
    access: read-only
    note: per-iteration event stream; bounded to its own directory, size-capped
    max_bytes: 2097152 # MAX_EVENT_BYTES
  - path: ~/.coven/research/synthesis
    access: read-only
    note: generated synthesis documents and INDEX.md; recursively bounded
    max_bytes: 4194304 # MAX_AUTORESEARCH_DOCUMENT_BYTES
  - path: ~/.coven/research/skills
    access: read-only
    note: staged skill drafts produced by completed research; recursively bounded
    max_bytes: 2097152 # MAX_INDEX_BYTES
default: deny
conflict_resolution: most-specific-path-wins
```

Three properties are directly relevant to ratifying §5–§6 as written, not as
aspiration:

1. **Symlink-safe containment** — it resolves both the allowed root and the
   requested target with `realpath` before comparing, then checks
   `target === root || target.startsWith(root + path.sep)`
   (`isWithinRoot`). This is the exact containment check §6 requires, already
   running against untrusted, model-generated path strings (a completion
   event can name an arbitrary `synthesisPath`/`stagedSkillPath`). It is
   covered by real symlink-escape tests in
   `src/lib/server/research-autoloop.test.ts` (e.g. `"fixed ledger, event,
   and index reads reject symlink escapes"`).
2. **Fail-closed on any resolution error** — the `try { … } catch { return
   null; }` shape means a broken symlink, a missing file, or a `..`-escape
   attempt all resolve to "not available" rather than to a guess. This is
   the live version of §3.6.
3. **Size-bounded reads per root** — `MAX_LEDGER_BYTES`, `MAX_EVENT_BYTES`,
   `MAX_INDEX_BYTES`, and `MAX_AUTORESEARCH_DOCUMENT_BYTES` cap what a
   contained-but-oversized file can cost a caller. This directly motivated
   promoting `max_bytes` into the core schema as an optional field in §4.

This implementation is entirely `read-only` and entirely a *reader* of
artifacts another process (the research-mission runner) writes. A `bound.md`
for the *writer* side of the pipeline is a distinct, not-yet-written
document — this reference covers only the read path that Coven Cave's UI
exposes today.

### 7.2 Project-root containment (Rust, OpenCoven/coven — daemon)

A second, independently-written implementation of the same containment
invariant ships in the Coven daemon/CLI:
[`crates/coven-cli/src/project.rs`](https://github.com/OpenCoven/coven/blob/main/crates/coven-cli/src/project.rs)
(`canonical_project_root`, `resolve_inside_root`), which the daemon uses to
validate every harness session's working directory against its declared
project root before spawning a PTY — documented publicly in
[Project Roots](https://github.com/OpenCoven/coven-docs/blob/main/content/docs/harnesses/project-roots.mdx)
and [Daemon security posture](https://github.com/OpenCoven/coven-docs/blob/main/content/docs/daemon/security.mdx).

```rust
pub fn resolve_inside_root(root: &Path, cwd: Option<&Path>) -> anyhow::Result<PathBuf> {
    let root = canonical_project_root(root)?;
    let candidate = match cwd {
        Some(cwd) if cwd.is_absolute() => cwd.to_path_buf(),
        Some(cwd) => root.join(cwd),
        None => root.clone(),
    };
    let candidate = normalize_canonical_path(candidate.canonicalize()?);

    if candidate == root || candidate.starts_with(&root) {
        Ok(candidate)
    } else {
        anyhow::bail!("cwd is outside the Coven project root");
    }
}
```

This is a single-root case (§2's `bound.md`, not `bounds.md`) rather than
§7.1's multi-root read-only set, and it governs which *working directory* a
session may start in, not arbitrary file reads — a narrower but equally
load-bearing instance of the same §6 enforcement contract, in a different
language, in a different repository, written independently of §7.1. Its test
suite (`crates/coven-cli/src/project.rs`, `#[cfg(test)] mod tests`) includes
an explicit `resolve_inside_root_rejects_symlink_escape` case, confirming
the same fail-closed, symlink-resolved containment behavior §6 requires.

Two independent, differently-scoped, differently-implemented systems already
converging on identical containment semantics (`realpath`-then-prefix-check,
fail-closed on any resolution error) is the strongest evidence available
that §4–§6 describe a real, portable pattern rather than one team's local
convention — the bar this spec sets for calling itself "production-ready."

## 8. Conformance test suite (v1.0)

**Case set A — derived from §7.1** (multi-root, read-only). Given the
`research-autoloop`-derived `bound.md` in §7.1 and a workspace where
`~/.coven/research/synthesis/report.md` exists and
`~/.coven/research/synthesis/../secrets.md` (i.e.
`~/.coven/research/secrets.md`) also exists:

| Request | Expected result | Why |
|---|---|---|
| Read `~/.coven/research/synthesis/report.md` | allow (read-only) | contained, resolves under the declared root |
| Read `~/.coven/research/synthesis/../secrets.md` | deny | resolves outside the declared root once normalized |
| Write `~/.coven/research/synthesis/report.md` | deny | root is `read-only`, not `read-write` |
| Read `~/.coven/research/synthesis/report.md` via a symlink planted at `~/.coven/research/synthesis/link` pointing outside the root | deny | `realpath` resolution places the real target outside the root |
| Read any path not listed under `roots` | deny | `default: deny` |

**Case set B — derived from §7.2** (single-root, working-directory
resolution). Given a `bound.md` with one `roots` entry
`{ path: /project, access: read-write }`:

| Request | Expected result | Why |
|---|---|---|
| Resolve cwd `/project` | allow | equals the declared root |
| Resolve cwd `/project/child` | allow | contained under the declared root |
| Resolve cwd `/outside` | deny | outside the declared root |
| Resolve cwd `/project/escape` where `escape` is a symlink to `/outside` | deny | `realpath`/`canonicalize` resolution places the real target outside the root |

Both case sets are drawn from tests that already pass against real,
independently-implemented code (§7.1, §7.2), not hypothetical fixtures.
Further cases (inheritance via `extends`, `bounds.md` multi-subject
dispatch, version-refusal behavior, `max_bytes` enforcement) remain open
work — tracked in §9 — and should be added as companion fixture files once a
first standalone reference parser exists (§10), rather than specified in
prose only.

## 9. Open questions

Resolved in this revision (see inline notes above): `max_bytes` promoted to
an optional core field (§4); `bounds.md` scope kept OpenCoven-internal for
v1.0 (§2); the `coven-autoloop` naming inconsistency (§7).

Still open, flagged rather than resolved by assertion:

- **Single canonical parser, or spec-plus-multiple-implementations?** §7.1
  and §7.2 show two independent, conformant implementations already exist
  in production, in two different languages, without ever having read this
  spec. That is stronger validation than a single reference implementation
  would be, but neither is currently packaged as a standalone, reusable
  parser library — both are private internals of their host codebases. §10
  proposes extraction as the next concrete step; not done yet.
- **External governance venue.** Whether this is proposed as a new AAIF
  project, an independent spec with later donation, or stays an
  OpenCoven-only convention has not been decided.
- **`bounds.md` generalization.** Deferred per §2, pending a real external
  adopter.
- **Amendment governance.** Who can change this schema once (if) adopted
  externally is undecided.
- **Domain registration status for `bound.md`/`bounds.md`.** The outline
  (2026-08-15) reported registration as initiated, with a same-day whois
  recheck still showing "No entries found" — attributed to registry
  propagation lag but never reconfirmed. This revision does not reconfirm it
  either; treat registration as **unverified**, not settled, until an actual
  whois/registrar check is performed and dated.

## 10. Suggested next steps

1. Perform and date a fresh whois check for `bound.md`/`bounds.md` before
   treating registration as fact anywhere else (see §9).
2. Extract a standalone reference parser + conformance harness from the
   shared pattern in §7.1/§7.2 (containment check + fail-closed error
   handling), using §8's two case sets as its first fixtures. This is the
   fastest path to a single canonical implementation rather than a paper
   spec, and de-risks the "spec-only" concern in §9.
3. Publish as a standalone spec repo before pitching AAIF or any external
   venue, arriving with a working implementation and two production
   precedents rather than a proposal alone.

## Revision history

- **v1.0** (this revision): renamed §7 to "Reference implementations"
  (plural); corrected the `coven-autoloop` naming error and traced it to its
  source (a planning doc, not shipped code); added §7.2 (`coven` daemon's
  Rust `project.rs`) as a second independent implementation; promoted
  `max_bytes` to an optional v1.0 schema field; resolved `bounds.md` scope
  for v1.0; added conformance case set B; left domain-registration status
  explicitly unverified rather than asserting it either way.
- **v0.1**: first drafted standard, resolving the outline's open semantics
  and citing §7.1 (then mislabeled `coven-autoloop`) as reference evidence.
- **Outline** (2026-08-15): prior-art and positioning pass, kept at
  [`2026-08-15-spec-outline.md`](./2026-08-15-spec-outline.md) as historical
  record.

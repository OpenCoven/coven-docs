---
name: long-running-goals
description: Maintain long-running, cross-session goals for an agent (Copilot CLI, Claude Code, Codex, etc.) using a declarative goals.md file. Use when the user wants the agent to remember objectives across sessions, when they say "let's set a goal", "remember to keep working on X", "what are we working on?", "resume the goal", or asks for persistent objectives that survive context resets and compaction.
---

# Long-Running Goals

A lightweight, agent-agnostic alternative to bespoke session/memory systems. Goals live in human-readable `goals.md` files the user can edit directly — no daemons, no databases.

## When to use

- User says "let's set a goal", "remember this objective", "keep working on X across sessions"
- User asks "what are we working on?", "what goals are active?", "resume the goal"
- A task is too large for one session and needs incremental progress across many
- You're about to lose context (compaction, /clear, /new) and want continuity

Do **not** use for ephemeral todos within a single session — use the runtime's todo tool or a plan.md for that.

## File locations

| Scope | Path | When |
|---|---|---|
| Per-repo | `.copilot/goals.md` (or `.claude/goals.md`, `.codex/goals.md` — match the agent) | Default. Project-specific objectives. |
| Global  | `~/.copilot/goals.md` (or `~/.claude/goals.md`, etc.) | Cross-repo objectives ("learn Rust", "migrate everything to pnpm"). |

When both exist, **always read both** at session start. Per-repo takes precedence on conflicts.

Add `.copilot/goals.md` to `.gitignore` unless the team wants shared goals committed (ask the user).

## File format

```markdown
# Goals

<!-- managed by the long-running-goals skill — humans may edit freely -->

## active

### goal: <short-id-kebab-case>
- title: One-line summary
- created: 2026-05-18
- updated: 2026-05-18
- progress: 0/5 work units
- notes: |
    Free-form context the agent needs to resume work.
    Acceptance criteria, links, decisions made.
- next: The single next concrete action.

### goal: <another-id>
...

## paused

### goal: <id>
- title: ...
- paused: 2026-05-17
- reason: blocked on API access

## done

### goal: <id>
- title: ...
- completed: 2026-05-16
- outcome: PR #42 merged
```

Keep it small. If a goal grows past ~30 lines, link out to a design doc instead of inlining.

## Workflow

### On session start (if either goals file exists)

1. Read both files in parallel.
2. If there are `active` goals, surface them to the user briefly:
   > "Active goals: (1) <title> — next: <next>. (2) <title> — next: <next>. Resume work on one, or continue with something else?"
3. Wait for direction before acting. Do **not** auto-start work — the user's current message takes priority.

### Adding a goal

When the user asks to set a goal:
1. Confirm: title, scope (per-repo or global), acceptance criteria, the first `next` action.
2. Create the file if missing (with the header comment).
3. Append under `## active` with a fresh kebab-case id.
4. Echo back: "Saved goal `<id>` to `<path>`."

### Working on a goal

1. Read the goal's `notes` and `next` to recover context.
2. Do the work for the current session.
3. Before ending the session (or before /clear), update:
   - `updated:` to today's date
   - `progress:` if measurable
   - `notes:` with new decisions/context (append, don't rewrite history)
   - `next:` to the new single next action
4. If complete, move the goal to `## done` with `completed:` and `outcome:`.
5. If blocked, move to `## paused` with `reason:`.

### Editing goals

The file is the source of truth. If the user edits it directly, respect their edits — never overwrite without re-reading first. Use targeted edits, not full rewrites.

## Principles

- **One file, two locations.** Per-repo + global. Nothing else.
- **Human-readable + human-editable.** No JSON, no DB. Markdown the user owns.
- **Idempotent updates.** Re-reading and re-writing should converge, not diverge.
- **Survives compaction.** Goals live on disk, not in context. They're durable by construction.
- **Don't auto-resume.** Surface, then wait for the user.
- **Don't grow unbounded.** Move done/abandoned goals out, or link to longer docs.

## Anti-patterns

- ❌ Treating goals.md as a todo list (use todos for within-session work).
- ❌ Auto-starting goal work on session start without user confirmation.
- ❌ Writing structured data the user can't read or edit (YAML inside JSON inside markdown, etc.).
- ❌ Creating a goal for every user request — only when the user explicitly asks for persistence.
- ❌ Storing secrets, credentials, or PII in goals.md.

## Template

See `references/goals.template.md` for a copy-paste starting file.

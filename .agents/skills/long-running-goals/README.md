# long-running-goals

Agent skill that maintains long-running, cross-session goals via a human-editable `goals.md` file. Works with Copilot CLI, Claude Code, Codex, and any agent that loads markdown skills.

## Install

```bash
npx skills add BunsDev/copilot-skills@long-running-goals
```

Or copy `SKILL.md` and `references/` into your agent's skills directory.

## Why

Sessions die. Context windows compact. Plans get lost. This skill gives agents a tiny, durable, user-owned file (`.copilot/goals.md` per-repo, `~/.copilot/goals.md` global) that survives all of that.

No daemons, no databases, no JSON the user can't read. Just markdown.

## Workflow

1. Set a goal: "Let's set a long-running goal: migrate from npm to pnpm across all repos."
2. The agent writes it to `~/.copilot/goals.md` under `## active`.
3. Days later, in a fresh session: the agent reads goals.md, surfaces active goals, asks what to do.
4. Work happens, `notes:` and `next:` get updated.
5. When done, the goal moves to `## done` with an outcome.

See [`SKILL.md`](./SKILL.md) for the full spec.

## License

MIT

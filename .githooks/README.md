# Git hooks (tracked, shared)

These hooks are version-controlled and shared across clones. They are activated
by pointing git at this directory:

```sh
git config core.hooksPath .githooks
```

`pnpm install` does this automatically via the `prepare` script in
`package.json`, so a fresh clone gets them after installing dependencies. To
enable them without a full install, run the command above once.

## Hooks

- **`pre-commit`** — scans staged files for secrets with `gitleaks` (skips with
  a warning if gitleaks is not installed). Allow-list false positives in
  `.gitleaks.toml`.
- **`pre-push`** — runs `pnpm run check:mermaid` when the push touches `.mdx` or
  Mermaid tooling, blocking the push on invalid diagram syntax. `check:mermaid`
  is also in the `build` chain, so Vercel rejects broken diagrams at deploy.

## Notes

- Setting `core.hooksPath` makes git use **only** this directory, so any old
  untracked hooks under `.git/hooks/` no longer run.
- Emergency bypass (avoid): `git commit --no-verify` / `git push --no-verify`.

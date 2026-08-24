# Coven docs release runbook

## Preconditions

- The target commit is on `main`.
- Repository CI completed `pnpm verify`.
- Vercel build uses `pnpm build` with a frozen lockfile.
- Generated OpenAPI pages are committed and clean.
- No unresolved security or accuracy blocker is attached to the release.

## Release verification

Record the target commit SHA, then verify:

```bash
pnpm install --frozen-lockfile
pnpm verify
git status --short
```

The working tree must remain clean except for the ignored built OpenAPI
intermediate.

Confirm `/build.txt` and the `x-coven-docs-commit` response header identify the target SHA. Then smoke:

- `/`
- `/docs`
- `/docs/guide/getting-started`
- `/docs/guide/ecosystem`
- `/docs/reference/api`
- `/docs/openapi`
- `/docs/experimental/agent-filesystem`
- `/llms.txt`
- `/llms-full.txt`
- `/robots.txt`
- `/sitemap.xml`
- `/build.txt`

Confirm the retired AFS route redirects:

```text
/docs/guide/agent-filesystem
  → /docs/experimental/agent-filesystem
```

## Rollback

1. Identify the last production deployment whose commit passed repository CI.
2. Promote that deployment or revert the offending commit on `main`.
3. Re-run production smoke against the restored deployment.
4. Open a follow-up issue with the failed commit, route, observed behavior, and
   missing guard.
5. Do not bypass generated-contract or link failures to restore production;
   fix or revert the source.

## Release evidence

Attach to the release or deployment record:

- source commit;
- GitHub Actions run;
- Vercel deployment;
- generated-contract result;
- browser-smoke result;
- any intentionally accepted preview or experimental exception.

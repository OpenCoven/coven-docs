# Coven docs release runbook

## Preconditions

- The target commit is on `main`.
- Repository CI completed `pnpm verify`.
- Vercel build uses `pnpm build` with a frozen lockfile.
- Generated OpenAPI pages are committed and clean.
- No unresolved production-freshness, source-drift, security, or accuracy
  blocker is attached to the release.

## Main branch release rules

Configure an active `main documentation release integrity` ruleset for
`refs/heads/main`. Its release contract requires:

- a pull request with all review conversations resolved;
- the `Verify documentation release` check from GitHub Actions (app ID `15368`);
- the `Vercel` deployment status from Vercel (app ID `8329`);
- an up-to-date branch before merge;
- no force pushes or branch deletion.

GitHub displays the Actions workflow as `Docs`; the required check context is
`Verify documentation release`, without a `Docs /` prefix. Bind both checks to
their producing apps so another integration cannot satisfy them by name alone.
Use squash merge for documentation releases. New commits dismiss stale
approvals. Enable CODEOWNERS approval for governance, source-lock, workflows,
OpenAPI, proxy, and verification changes when a second qualified maintainer is
available; do not invent that coverage for a sole-maintainer repository.

Leave the standing bypass list empty. Administrators follow the same pull-request
and check requirements during ordinary work. Confirm the active configuration
in [repository rulesets](https://github.com/OpenCoven/coven-docs/settings/rules)
and the effective rules on `main` before relying on this policy:

```bash
gh api repos/OpenCoven/coven-docs/branches/main --jq .protected
gh api repos/OpenCoven/coven-docs/rules/branches/main
```

Configuration readback proves which rules are active. It does not substitute
for recorded enforcement evidence or prove that every delivery check passed.

## Incident-only recovery bypass

Prefer a verified revert pull request or restoration of a previously verified
Vercel deployment. Keep a deployment/commit mismatch incident open until the
source and deployed commit agree again.

If repository checks themselves prevent urgent recovery, an administrator may
temporarily add the repository administrator role to this ruleset with
**For pull requests only** bypass. Record the incident, the exact recovery PR
head, affected check, administrator, reason, manual verification, and removal
condition before using it. The recovery must still go through a pull request;
do not use the incident path for direct pushes, force pushes, branch deletion,
unreviewed changes, or bypassing a known source/contract/link defect.

Remove the bypass immediately after the recovery merge. Read back the ruleset
and effective `main` rules, verify the exact production commit, and attach the
check, deployment, and bypass-removal evidence to the incident. A check outage
is not evidence that the recovery build passed; retain any unresolved proof
gap until a successful run verifies it.

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

## Automated post-deploy evidence

Only a new push cancels an active production check. Hourly and manually
dispatched checks wait behind an active check so they do not interrupt a push's
deployment grace period and report a false stale-deployment incident.

`.github/workflows/docs-live.yml` polls production after a push to `main` and
then every hour. The release is not healthy until its artifact reports:

- the expected and deployed commits match;
- primary HTML routes share the same deployment header;
- agent exports and sitemap are reachable;
- the canonical first-session, troubleshooting, and API routes contain their
  expected release markers.

`.github/workflows/docs-source-drift.yml` runs daily. Any open source-drift
incident means the affected sections require review before they can be called
current, even when the website itself is available.

## Rollback

1. Identify the last production deployment whose commit passed repository CI.
2. Promote that deployment or revert the offending commit on `main`.
3. Re-run production smoke against the restored deployment.
4. Confirm the automated production incident closes after recovery.
5. Open a follow-up issue with the failed commit, route, observed behavior, and
   missing guard.
6. Do not bypass generated-contract, source-lock, or link failures to restore
   production; fix or revert the source.

## Release evidence

Attach to the release or deployment record:

- source commit;
- GitHub Actions verification run;
- Vercel deployment;
- generated-contract result;
- browser-smoke result;
- live-production report;
- source-drift report;
- any intentionally accepted preview or experimental exception.

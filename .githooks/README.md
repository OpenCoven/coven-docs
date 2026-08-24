# Git hooks (tracked and shared)

These hooks are version-controlled and activated with:

```sh
git config core.hooksPath .githooks
```

`pnpm install` runs that command through the `prepare` script.

## Hooks

- **`pre-commit`** scans staged files for secrets with Gitleaks when installed.
  Allow-list verified false positives in `.gitleaks.toml`.
- **`pre-push`** inspects the pushed file set and runs the relevant local
  subset of the release contract:
  - content, route, link, heading-fragment, and Mermaid checks for docs changes;
  - generated OpenAPI drift checks for contract changes;
  - OpenAPI preparation and TypeScript checking for source changes.

Repository CI remains authoritative and runs the full `pnpm verify` contract,
including the production build and Chromium smoke.

## Notes

- `core.hooksPath` replaces hooks under `.git/hooks/`.
- Missing local tools produce a warning rather than pretending the check ran.
- Emergency bypasses (`--no-verify`) should be reserved for recovery; CI still
  enforces the contract.

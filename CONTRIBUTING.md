# Contributing to Coven documentation

Thank you for helping make Coven understandable, accurate, and safe to operate.
OpenCoven is MIT licensed and community-driven.

## Canonical facts and ownership

`coven-docs` is canonical for the public Coven runtime journey, but it does not
invent runtime facts.

Before changing behavior claims:

1. Identify the repository that owns the contract.
2. Verify the claim against implementation, tests, a versioned specification,
   or a released machine-readable contract.
3. Link the source in the pull request.
4. Preserve the page's stability classification. Do not present preview or
   experimental work as a supported production workflow.

The section ownership and stability map lives in
[`docs/site-manifest.json`](docs/site-manifest.json).

## Development workflow

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Before opening or updating a pull request:

```bash
pnpm verify
git diff --check
```

When the OpenAPI source changes, run:

```bash
pnpm openapi:build
```

Commit the regenerated `content/docs/openapi/` output.

## Documentation definition of done

A documentation change is complete when:

- commands, options, response fields, and failure behavior match their owning
  source;
- the intended reader and stability level are unambiguous;
- the primary path uses progressive disclosure instead of mixing contributor
  or experimental material into onboarding;
- internal links and heading fragments resolve;
- redirects preserve retired public URLs;
- keyboard, mobile, and semantic heading behavior remain sound;
- generated artifacts are current;
- `pnpm verify` passes from a clean checkout;
- the pull request explains how the claim was verified.

Avoid unsupported dates, release promises, security guarantees, benchmark
generalizations, and copied implementation details that are not part of a
stable contract.

## Developer Certificate of Origin

OpenCoven uses the **Developer Certificate of Origin (DCO) v1.1** for all
contributions. This is a lightweight mechanism—not a CLA—that asks you to
certify that you have the right to submit your work.

By making a contribution, you certify that:

> (a) The contribution was created in whole or in part by you and you have the
> right to submit it under the open source license indicated in the file; or
>
> (b) The contribution is based upon previous work that, to the best of your
> knowledge, is covered under an appropriate open source license and you have
> the right under that license to submit that work with modifications, whether
> created wholly or partly by you, under the same open source license unless
> permitted otherwise; or
>
> (c) The contribution was provided directly to you by another person who
> certified (a), (b), or (c), and you have not modified it.
>
> (d) You understand that the project and contribution are public and that a
> record of the contribution, including your sign-off, is maintained
> indefinitely.

Sign commits with:

```bash
git commit -s -m "docs: describe the change"
```

## Patent non-assertion

By contributing, you additionally agree not to assert patent claims—now held or
later acquired—against this project or its users when those claims arise from
your contribution. See [PATENTS](PATENTS).

## Pull-request shape

Keep pull requests reviewable and contract-focused. Separate unrelated
information-architecture, generated-contract, and visual changes when doing so
improves verification. Every pull request should include:

- source-of-truth references;
- stability impact;
- affected public routes and redirects;
- commands run;
- screenshots only when visual behavior changed.

## Security reports

Do not open a public issue for an exploitable site or documentation-pipeline
vulnerability. Follow [SECURITY.md](SECURITY.md).

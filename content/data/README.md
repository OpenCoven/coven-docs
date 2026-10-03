# CLI help capture

`coven-cli-help.json` is the unedited, pretty-printed output of
`coven help --all --json`. It records 42 public commands in six groups. The
companion provenance file records its SHA-256, the capture's CLI version and
source commit, and the reviewed `docs/source-lock.json` pin.

The current capture came from `coven v0.4.7-1-gc8fd9e84`. Its CLI definition and
help catalog have identical Git blobs at the captured source commit and the
reviewed pin:

- [CLI definition and command dispatch](https://github.com/OpenCoven/coven/blob/eb3273e19670d2ab5bf1374783d96c11a50b0be2/crates/coven-cli/src/main.rs)
- [Help groups and serializer](https://github.com/OpenCoven/coven/blob/eb3273e19670d2ab5bf1374783d96c11a50b0be2/crates/coven-cli/src/help.rs)
- [Owning help-disclosure tests](https://github.com/OpenCoven/coven/blob/eb3273e19670d2ab5bf1374783d96c11a50b0be2/crates/coven-cli/tests/help_disclosure.rs)

This is a runtime capture checked against source, not a reproducible-build
attestation. Local checks do not execute an arbitrary installed Coven binary or
fetch upstream source. The hosted source-freshness gate separately watches the
CLI definition and help catalog for upstream changes.

## Update the capture

1. Review the CLI definition, help groups, serializer, and owning tests at the
   source-lock pin. Establish the source commit for the CLI being captured.
2. Run `coven help --all --json` twice and compare the outputs byte for byte.
   Record `coven --version`; keep command names, summaries, URLs, and ordering
   exactly as emitted. Do not rewrite upstream URLs to preferred site routes.
3. Verify both `main.rs` and `help.rs` Git blobs at the captured source commit
   match the reviewed pin. If they differ, use a CLI built from the reviewed
   source or reconcile the source pin first. Record the blob ids, commits,
   counts, and SHA-256 of the new capture in the provenance file.
4. Review the full fixture diff and update reference pages, redirects, and the
   CLI command map for every public command. Any preferred index destination
   must point to the command's actual reference section.
5. Run `pnpm verify` and `git diff --check`. Include immutable owning-source links
   and capture evidence in the pull request.

`pnpm check:cli-docs` checks the capture hash (with CRLF normalized to LF), schema,
source pin and watched paths, unique groups/commands, public-only entries,
canonical docs origins, redirect destinations, heading fragments, and a linked
command-map row for every command. Mutating the snapshot requires an explicit
provenance update and review; the hash alone does not prove upstream correctness.

Some index links are intentionally more specific than the help catalog:
`help` links to discovery instructions, `config` and `reset` to their CLI section,
`completions` and `kill` to their own examples, and `memory` to the command's
observability reference. Both the unchanged upstream URL and the preferred
index destination must resolve. The setup URL retains its existing redirect.

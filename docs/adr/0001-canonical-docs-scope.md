# ADR 0001: Coven documentation is a release-coupled runtime contract

- **Status:** Accepted
- **Date:** 2026-08-24

## Context

`coven-docs` accumulated runtime manuals, ecosystem orientation, experimental
roadmaps, generated API pages, and application-specific material. That breadth
made ownership ambiguous and allowed repository source, deployed production,
and neighboring OpenCoven products to drift.

## Decision

`coven-docs` is the canonical public documentation for:

- the Coven runtime;
- the `coven` CLI;
- daemon lifecycle and same-user local IPC;
- harness integration and provider-authentication boundaries;
- the supported versioned local API;
- runtime operations, recovery, and security behavior.

The repository may explain how neighboring OpenCoven projects integrate with
Coven, but it does not duplicate their complete manuals or normative
specifications.

The section order, owner, stability, search classification, redirects, and
retired surfaces are declared in `docs/site-manifest.json`.

Runtime facts come from the repository that owns the implementation or
normative specification. Generated contracts may supply inventories and
signatures; explanatory prose remains intentionally authored.

Experimental work is separated from the first-session path and labelled before
the page title. A capability is promoted only after its owner publishes the
necessary release, safety, and operational evidence.

## Consequences

- CLI and API drift become build failures rather than editorial surprises.
- The deployed site can be certified against one repository commit.
- Search and page chrome expose the same classification model.
- Old public URLs remain redirected without keeping retired manuals alive.
- Cross-repository integration work requires linked issues and explicit source
  ownership.

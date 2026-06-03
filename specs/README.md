# Specifications

This directory contains the project specifications.

Drafts live in `specs/draft/`.

Accepted specifications live in `specs/accepted/`.

`specs/accepted/manifest.json` declares accepted specifications and their relationships.

Main rules:

- drafts are working documents and are not strictly blocked;
- an `Accepted` specification must live in `specs/accepted/`;
- an `Accepted` specification must be present in `specs/accepted/manifest.json`;
- an `Accepted` specification must not contain an `agent-review` block;
- an `Accepted` specification must contain a `review-resolution` block;
- parent-child relationships and dependencies between accepted specs must remain coherent in the manifest.

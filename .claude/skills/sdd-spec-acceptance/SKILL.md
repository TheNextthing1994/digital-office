---
name: sdd-spec-acceptance
description: Accept a Draft spec or Change Request in this SDD repository. Use when the user says to accept, validate, approve, or finalize a spec or CR after isolated review notes have been read.
---

# SDD Spec Acceptance

Use this skill to accept one Draft `SPEC-*.md` or `CR-*.md` document. Do not use it to create new feature scope.

## Procedure

1. Read the target Draft spec or Change Request.
2. Confirm it has a current final `agent-review` block written by an isolated subagent.
3. Read every review finding. Resolve, explicitly ignore, or defer each finding before acceptance.
4. If the document changed after review, rerun isolated review for only that target document.
5. Remove the temporary `agent-review` block.
6. Add the required `review_resolution` block with all values set to `true`.
7. Change frontmatter `status` to `Accepted`.
8. For Change Requests, set `application_status` according to the intended state:
   - `accepted` when application is intentionally deferred;
   - `applied` when the CR is accepted and applied in the same operation.
9. Move the document to `specs/accepted/`.
10. Update `specs/accepted/manifest.json`.
11. Update relevant changelogs.
12. Run:

```bash
npm run review:hook
npm run validate
```

13. For final acceptance or applied CR work, also run:

```bash
npm run validate:pre-commit
npm run validate:pre-push
npm run validate:ci
```

## Guardrails

- Do not accept a document with unresolved `agent-review` notes still present.
- Do not directly edit an accepted spec's meaning unless an accepted Change Request authorizes it.
- Accepted specs and accepted Change Requests must be declared in the manifest.
- Draft specs are not manifest entries.
- Keep all repository documents in English.

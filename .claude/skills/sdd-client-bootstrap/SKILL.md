---
name: sdd-client-bootstrap
description: Initialize and verify a new client repository from this SDD template. Use when creating a client repo, running client:init, checking the generated scaffold, filling raw knowledge, or preparing the first client Global Spec.
---

# SDD Client Bootstrap

Use this skill when generating or verifying a client repository from the template.

## Procedure

1. From the template repository, run:

```bash
npm run client:init -- "Client Project Name" [target-parent-directory]
```

2. Confirm the generated project is outside the template tree.
3. Confirm the generated live `specs/` scaffold contains only:

```text
specs/README.md
specs/accepted/README.md
specs/accepted/manifest.json
specs/draft/README.md
```

4. Confirm `specs/accepted/manifest.json` contains only:

```json
{
  "schema_version": "1.0.0",
  "specs": []
}
```

5. Confirm template accepted specs, Change Requests, Draft specs, completed plans, active plans, changelog history, and template raw knowledge are not active in the generated client repo.
6. Confirm `project-knowledge/raw/RAW_PROJECT_KNOWLEDGE_CLIENT.md` exists or replace it with an external raw knowledge pointer.
7. Confirm Git branch setup:
   - `main` exists;
   - `dev` exists;
   - current branch is `dev`.
8. Run in the generated project:

```bash
npm run validate
npm run validate:pre-push
```

9. Use `templates/client-initialization-checklist.md` before first push.
10. Create the first client Global Spec from raw knowledge. It may use `SPEC-GLOBAL-001` because the generated client manifest starts empty.

## Guardrails

- Do not start product implementation before an accepted client Global Spec exists, unless the human explicitly approves a controlled bootstrap `OFFSPEC` plan.
- Do not use Change Requests before the first accepted client spec exists because there is no accepted target spec yet.
- Operational process files govern SDD mechanics; accepted client specs govern product and project authority.

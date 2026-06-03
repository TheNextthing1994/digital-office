---
name: sdd-plan-completion
description: Complete an active Specification-Driven Development plan after the human says the work was tested, approved, finished, or ready to close. Use for requests like "I tested it", "finish the plan", "mark the plan done", "we are done with this plan", or "push after plan completion".
---

# SDD Plan Completion

Use this skill only when closing an existing active plan. Do not create new scope while completing a plan.

## Procedure

1. Inspect `plans/active/` and identify the single active plan.
2. Read the plan, relevant accepted specs, current changelog entries, and validation rules.
3. Record the human approval precisely in the plan's `Human Verification` evidence and `Completion Notes`. Do not invent manual testing details.
4. Ensure work items are checked or explicitly explained.
5. Ensure automated validation items reflect commands actually run.
6. Update required changelogs for the plan's `work_area` and `impacted_areas`.
7. Update plan frontmatter:
   - `status: Done`
   - `changelog_refs` includes every required changelog file.
8. Move the plan from `plans/active/` to `plans/done/`.
9. Run:

```bash
npm run validate
npm run review:hook
npm run validate:pre-commit
npm run validate:pre-push
```

10. If validation fails, fix the issue or move the plan back to `Active` when the fix belongs to the same plan.
11. If Git is available and the user asked to finalize Git work, rebase on latest `dev`, rerun impacted validation, commit, push the branch, and prepare a pull request when a remote is configured.

## Guardrails

- Do not mark a plan `Done` while validation or human verification is missing.
- Do not keep an active plan before push; `pre-push` must fail while a plan remains active.
- Do not claim that the human tested more than they explicitly confirmed.
- If the completion requires new product behavior not covered by accepted specs or approved `OFFSPEC`, stop and create or update the appropriate spec/plan instead.

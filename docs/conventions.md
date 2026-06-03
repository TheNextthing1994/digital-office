# Template Conventions

This document defines the minimum conventions for the template. Scripts should verify these conventions whenever possible.

## Language

All project documents must be written in English.

This rule applies to:

- specifications;
- plans;
- changelogs;
- templates;
- repository documentation;
- raw project knowledge;
- JSON documentation fields.

Code identifiers, command names, and external proper nouns may keep their original form when required, but explanatory project content must stay in English.

## Branches

`main` is the production branch.

`dev` is the shared development branch and the team's source of truth.

All new work starts from an up-to-date `dev` branch.

A work branch is created only after a plan has been explicitly approved.

Recommended format:

```text
plan-<number>-<type>-<area>-<short-description>
```

Example:

```text
plan-0001-chore-repository-foundation
```

## Work Areas

Initial allowed work areas:

- `repository`
- `specs`
- `features`
- `fixes`
- `hotfix`
- `hooks`
- `validation`
- `docs`
- `api`
- `frontend`
- `database`
- `data-structures`
- `migrations`
- `workers`

The list may evolve, but it must remain controlled.

## Work Types

Initial allowed work types:

- `feature`
- `fix`
- `hotfix`
- `spec`
- `chore`
- `docs`
- `refactor`
- `validation`

## Specifications

Draft specifications live in `specs/draft/`.

Accepted specifications live in `specs/accepted/`.

The accepted-spec manifest lives in `specs/accepted/manifest.json`.

Draft specs are working documents. They may be incomplete, contain unresolved `agent-review` blocks, and remain undeclared in the manifest.

Accepted specs are the only authoritative specifications. Strict relationship validation, manifest validation, and review-resolution validation apply only to accepted specs.

Generated client repositories start with an empty accepted manifest. In that bootstrap state, copied operational files such as scripts, hooks, templates, docs, agent instructions, package commands and README guidance are SDD process authority. Accepted client specs become product and project authority after the client creates them.

Every specification must start with simple YAML frontmatter:

```yaml
---
id: SPEC-GLOBAL-001
type: GlobalSpec
status: Draft
title: Human-readable title
parent: null
depends_on: []
related_specs: []
work_area: specs
---
```

Allowed spec types:

- `GlobalSpec`
- `FeatureSpec`
- `SubFeatureSpec`
- `TechnicalSpec`
- `ChangeRequest`

Allowed statuses:

- `Draft`
- `Review`
- `Accepted`
- `Deprecated`

An `Accepted` specification must live in `specs/accepted/`.

An `Accepted` specification must be declared in `specs/accepted/manifest.json`.

An `Accepted` specification must not contain an unresolved review block.

An `Accepted` specification must contain a review-resolution block.

## Agent Review Block

The review sub-agent always appends its findings at the very end of the specification, between these markers:

```markdown
<!-- agent-review:start -->
reviewer: isolated-subagent
review_trigger: <lowercase-kebab-case-trigger>
reviewed_at: YYYY-MM-DD
reviewed_content_sha256: <sha256-of-spec-without-agent-review-block>
## Agent Review Notes

### Suggested Specs

### Open Questions

### Grey Areas

### Potential Problems

### Contradictions

### Logic Weaknesses

### Regression Risks
<!-- agent-review:end -->
```

This block is temporary.

Its presence does not block draft specs in `specs/draft/`.

Its presence blocks acceptance. A spec can move to `specs/accepted/` only after the review block has been read, handled, removed, and replaced by a `review_resolution` block.

This block must always be produced by an isolated sub-agent. It must not be written by the main agent that just created or modified the specification.

`review_trigger` must be a lowercase kebab-case token that describes why review ran.

Spec templates must not contain a real `agent-review` block. They may contain only the `<!-- isolated-agent-review-required -->` marker to signal that the hook or sub-agent must add the review after creation.

The sub-agent must not be rerun on every draft at every turn. It should be rerun only:

- when a new draft is created;
- when a draft has changed since its latest review, detected through `reviewed_content_sha256`;
- just before acceptance, if the latest review is stale;
- when a deliberate global structural change makes existing reviews obsolete.

When a review is rerun, the sub-agent replaces the existing `agent-review` block for that spec. It must not stack multiple review blocks.

## Review Resolution Block

An accepted specification must contain this block, with all values set to `true`:

```yaml
<!-- review-resolution:start -->
review_resolution:
  agent_review_read: true
  agent_review_resolved_or_explicitly_ignored: true
  unresolved_agent_review_blocks_removed: true
  human_acceptance_confirmed: true
<!-- review-resolution:end -->
```

## Manifest

`specs/accepted/manifest.json` declares accepted specifications and their relationships.

The manifest does not declare drafts.

Minimum structure:

```json
{
  "schema_version": "1.0.0",
  "specs": []
}
```

Each `specs` entry must contain:

- `id`
- `path`
- `type`
- `status`
- `parent`
- `depends_on`
- `related_specs`

## Plans

Only one active plan is allowed.

Active plans live in `plans/active/`.

Completed plans live in `plans/done/`.

Every plan must start with simple YAML frontmatter:

```yaml
---
id: PLAN-0001
status: Active
work_type: chore
work_area: repository
impacted_areas: ["specs", "validation"]
branch: plan-0001-chore-repository-foundation
spec_refs: ["SPEC-GLOBAL-001"]
has_offspec: false
changelog_refs: []
human_verification_required: true
---
```

This example assumes `SPEC-GLOBAL-001` is an accepted client-local spec. In a generated client with an empty accepted manifest, first-spec preparation should use `spec_refs: []`, `has_offspec: true` and a controlled bootstrap `OFFSPEC` item.

Every work item must reference a spec:

```markdown
- [ ] [SPEC: SPEC-GLOBAL-001] Do the work described by the spec.
```

Controlled exception:

```markdown
- [ ] [OFFSPEC: OFFSPEC-001] Required work not yet covered by a spec.
```

`Offspec` must remain rare and justified in the plan.

An implementation plan must reference accepted specifications. If the work is not yet covered by an accepted spec, it must use `OFFSPEC`.

Each exception must be documented in the plan's `Offspec Exceptions` section:

```markdown
### OFFSPEC-001

- Reason: Local setup blocks the work, but no spec covers this point yet.
- Why now: Required to run the plan validations.
- Impacted area: validation
- Follow-up required: true
- Follow-up type: TechnicalSpec
- Follow-up target/owner/due condition: `SPEC-TECH-001` update before bootstrap exit
- Approved by: Human
- Approved at: 2026-05-20
```

The `has_offspec` frontmatter field only indicates whether the plan contains at least one exception. The details must remain attached to each item and each `OFFSPEC-*` block.

In a generated client with an empty accepted manifest, first-spec preparation may be planless or may use a controlled bootstrap `OFFSPEC` plan. Normal product work must wait for accepted client specs. After the first client Global Spec is accepted, plans should reference accepted client specs and use `OFFSPEC` only for narrow, approved exceptions.

A plan branch must be created only after explicit human approval.

Approval must be recorded in a `Human Approval` section in the plan before branch creation.

If scope changes materially during implementation, the plan must be updated and human approval must be renewed before continuing.

Before a plan moves to `plans/done/`, the branch should be rebased on the latest `dev`. If rebase or conflict resolution changes behavior, impacted validation, human verification and changelogs must be updated before the plan is marked Done.

Push is blocked while a plan remains active. Therefore the plan must be marked Done only after final validation and before the branch is pushed.

## Human Verification For Plans

Every plan must contain a `Human Verification` section.

This section is separate from automated tests. It explains what a human must actually verify, as a step-by-step tutorial.

It must contain at minimum:

- `Prerequisites`: what must be ready before manual testing;
- `Steps`: the concrete actions to perform in order;
- `Expected Results`: what the human must observe;
- `Evidence`: screenshots, notes, terminal output, or useful links when relevant.

Example:

```markdown
## Human Verification

### Prerequisites

- Local environment is ready.
- `npm run validate` has passed.

### Steps

1. Open the affected page or file.
2. Perform the changed workflow.
3. Verify the expected result.
4. Check one related existing workflow for regression.

### Expected Results

- The behavior matches the relevant specification.
- No unexpected error or regression is visible.

### Evidence

- Add screenshots, notes, or command output if relevant.
```

A plan must not be considered ready to finish if its human verification is unclear.

## Changelogs

Changelogs are organized by work area or technical slice in `changelogs/`.

Every completed plan must update the relevant changelogs before push.

New changelog entries are written newest-first, after the top-level `# Changelog - ...` heading and any non-entry introductory paragraph, and before the first `## YYYY-MM-DD - ...` entry.

Plans must declare `impacted_areas` in frontmatter. `work_area` is the primary ownership area, and `impacted_areas` lists every additional technical area materially touched by the work.

Generic work areas such as `features`, `fixes` and `hotfix` describe the work context. They must still list concrete impacted areas such as `frontend`, `api`, `database`, `workers`, `validation`, `hooks`, `specs` or `repository`.

`impacted_areas` must not contain generic `features`, `fixes` or `hotfix` values.

The initial changelog mapping is:

| Area | Changelog |
| --- | --- |
| `repository` | `changelogs/repository.md` |
| `specs` | `changelogs/specs.md` |
| `docs` | `changelogs/docs.md` |
| `validation` | `changelogs/validation.md` |
| `hooks` | `changelogs/hooks.md` |
| `api` | `changelogs/api.md` |
| `frontend` | `changelogs/frontend.md` |
| `database` | `changelogs/database.md` |
| `data-structures` | `changelogs/data-structures.md` |
| `migrations` | `changelogs/migrations.md` |
| `workers` | `changelogs/workers.md` |

Area aliases are not implicit. If a new area should be owned by an existing changelog, the mapping, validator and conventions must explicitly declare that ownership.

Recommended format:

```markdown
## YYYY-MM-DD - PLAN-0001 - Short title

- Branch/PR: `plan-0001-chore-repository-foundation`
- Work area: `repository`
- Impacted areas: `specs`, `validation`
- Spec refs: Accepted client spec IDs, or `None` only for permitted bootstrap/process entries
- Change request refs: None
- Summary: Short summary.
- Tests/validations: `npm run validate`
- Human verification: Summary of manual checks or `Not applicable` with reason.
- Manual operations: None
```

For planless governance work, such as spec acceptance or accepted manifest relationship changes, the changelog trace ID can be the governing accepted `SPEC-*` or `CR-*` ID instead of a plan ID.

## Change Requests

Change Requests are specification documents with `type: ChangeRequest`.

Draft Change Requests live in `specs/draft/` and use `CR-0001-short-title.md` filenames.

Accepted Change Requests live in `specs/accepted/` and are declared in `specs/accepted/manifest.json`.

A Change Request must identify `target_spec`, use the same isolated `agent-review` block contract as specs, and record `application_status`.

Initial `application_status` values are:

- `proposed`;
- `accepted`;
- `applied`;
- `rejected`;
- `superseded`.

Accepted Change Requests with deferred application use `application_status: accepted` and must record the deferral reason in the document or changelog.

## Client Initialization

Client repositories created from this template start with no accepted specs.

Their generated live `specs/` scaffold contains only:

```text
specs/README.md
specs/accepted/README.md
specs/accepted/manifest.json
specs/draft/README.md
```

The generated manifest starts as:

```json
{
  "schema_version": "1.0.0",
  "specs": []
}
```

Copied operational files define repository workflow and must not be treated as client product requirements.

The first client Global Spec may use `SPEC-GLOBAL-001` because template process spec IDs are not copied into the generated client manifest.

Client initialization must replace the active template raw knowledge file, reset or archive template plan and changelog history, and keep reusable validation, hook, template and documentation infrastructure.

Use `templates/client-initialization-checklist.md` for first-run setup.

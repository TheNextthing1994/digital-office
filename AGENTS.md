# Repository Agent Rules

This repository uses Specification-Driven Development.

In the template repository, accepted specifications are the source of truth for template behavior. Draft specs, raw knowledge and conversation context are not implementation authority unless a controlled `OFFSPEC` exception explicitly says so.

In generated client repositories, the repository starts with no accepted specs. Copied operational files such as scripts, hooks, templates, docs, agent instructions, package commands and README guidance are SDD process authority. Accepted client specs become product and project authority after the client creates them.

All project documents must be written in English. This includes specs, plans, changelogs, templates, conventions, raw project knowledge and JSON documentation fields.

## Authority Model

- Draft specs live in `specs/draft/`.
- Accepted specs live in `specs/accepted/`.
- The accepted manifest is `specs/accepted/manifest.json`.
- Only accepted specs declared in the manifest are specification authority.
- Draft specs may be incomplete, unreviewed or stale, and must not be used as normal plan authority.
- Accepted specs must not contain unresolved `agent-review` blocks.
- Accepted specs must contain a `review_resolution` block.
- Generated client repositories may start with an empty accepted manifest. During that bootstrap state, operational process files govern SDD workflow mechanics and product implementation remains blocked until accepted client specs exist or a controlled bootstrap `OFFSPEC` exception is approved.

## Workflow Authority Boundary

Accepted specs and plans may govern product behavior, implementation work and plan-specific evidence, but they must not change the repository workflow by implication.

A spec or plan must not create new durable workflow conventions, required repository directories, client-initialization behavior, hook behavior, validation gates or agent operating rules unless that workflow/process change is explicitly made in the operational process authority files that own it, such as `AGENTS.md`, `docs/conventions.md`, templates, hooks, validation scripts, initialization scripts or package commands.

## Isolated Review Model

Never write `agent-review` notes from the same agent turn that created or edited the specification or Change Request.

After creating or modifying any `specs/draft/SPEC-*.md` or `specs/draft/CR-*.md` document, spawn an isolated subagent to review it.

The isolated reviewer must use the strongest available reviewer model. For Codex, the current required setting is:

- `model: gpt-5.5`
- `reasoning_effort: xhigh`

If that exact model or reasoning setting is unavailable, use the strongest available alternative and record the fallback in the review summary or surrounding work notes.

The isolated subagent must:

- read the target Draft spec or Change Request;
- inspect `specs/accepted/manifest.json`;
- inspect directly referenced accepted specs;
- inspect `docs/conventions.md` and `docs/agent-review-hooks.md`;
- inspect related Draft specs, raw knowledge, templates, scripts, hooks and code when needed;
- detect suggested specs, open questions, grey areas, potential problems, contradictions, logic weaknesses and regression risks;
- append or replace exactly one `agent-review` block at the very end of the target document;
- include `reviewer: isolated-subagent`, `review_trigger`, `reviewed_at` and `reviewed_content_sha256` metadata.

Do not rerun review across every Draft spec unless a deliberate global structural change makes existing reviews obsolete. Rerun only the missing or stale target review when possible.

## Acceptance Rules

Before accepting a spec or Change Request, the human or main agent must read the latest isolated review notes.

Every finding must be either:

- resolved by changing the document;
- explicitly ignored as not relevant or not worth changing;
- deferred to a future spec, Change Request or plan.

When the main agent must decide which isolated review findings are critical enough to change before acceptance, use the SDD review triage skill before patching or accepting the document:

- Codex uses `.agents/skills/sdd-review-triage/SKILL.md`.
- Claude Code uses `.claude/skills/sdd-review-triage/SKILL.md`.

Use review triage only after a current `agent-review` block exists on the target Draft spec or Change Request. The triage output is limited to `Take Into Account` and `Do Not Take Into Account`. Patch findings classified `Take Into Account` unless the human explicitly overrides the triage. Do not patch findings classified `Do Not Take Into Account` unless the human explicitly asks for that broader change.

Acceptance then requires:

- remove the temporary `agent-review` block;
- add the required `review_resolution` block;
- set status to `Accepted`;
- move the document to `specs/accepted/`;
- update `specs/accepted/manifest.json`;
- update relevant changelogs;
- run validation.

Do not directly edit an accepted spec to change its meaning. Use a Change Request unless the work is the controlled acceptance or application flow already authorized by the project specs.

## Change Requests

Change Requests are spec documents with `type: ChangeRequest`.

- Draft Change Requests live in `specs/draft/`.
- Accepted Change Requests live in `specs/accepted/`.
- A Change Request must identify `target_spec`.
- The isolated reviewer must inspect the target accepted spec, related accepted specs, manifest relationships, likely downstream impact, changelog expectations and code when needed.
- Applying an accepted Change Request must update the target spec, manifest, changelogs and validation evidence as authorized by the accepted Change Request.

## Plans And Branches

Only one active plan is allowed.

- Active plans live in `plans/active/`.
- Completed plans live in `plans/done/`.
- A plan branch is created only after explicit human approval.
- Work starts from an up-to-date `dev` branch.
- `main` is production.
- `dev` is shared development and the team source of truth.

Plans must reference accepted specs through `spec_refs` and inline `[SPEC: SPEC-*]` work items.

Work not covered by accepted specs must use an explicit `[OFFSPEC: OFFSPEC-*]` item and a matching `Offspec Exceptions` section. `OFFSPEC` is rare and must explain why the work is needed now, who approved it and what follow-up is required.

In generated clients with an empty accepted manifest, first-spec preparation may be planless or may use a controlled bootstrap `OFFSPEC` plan. Normal product work must wait for accepted client specs.

Plans must include concrete human verification steps. They should read like a practical manual test checklist, not just a generic statement.

Before a plan is marked `Done`:

- implementation work is complete;
- automated validation passes;
- human verification is complete;
- relevant changelogs are updated;
- the branch is rebased on latest `dev` when Git is available;
- conflicts or late fixes are reflected in validation, human verification and changelogs.

Pre-push and CI validation must fail while any active plan exists.

## Changelogs

Changelogs are organized by technical work area in `changelogs/`.

Update the relevant changelog files when:

- a plan is completed;
- an accepted spec is added, changed, deprecated or moved;
- the accepted manifest changes;
- a Change Request is accepted, rejected, superseded or applied;
- bootstrap raw knowledge is classified, archived or deleted;
- a migration, rollback or manual operation changes project state.

Changelog entries should use the accepted entry structure from `SPEC-FEATURE-004`, including `TRACE-ID`, branch or PR, work area, impacted areas, spec refs, validations, human verification and manual operations.

Routine Draft edits do not require changelog entries unless they prepare acceptance or are part of a tracked plan.

## Validation Commands

Use the deterministic commands provided by `package.json`:

```bash
npm run validate
npm run validate:pre-commit
npm run validate:pre-push
npm run validate:ci
npm run review:hook
```

`npm run review:hook` detects Draft specs and Draft Change Requests that need isolated review. It does not replace the reviewer subagent.

## Hooks

Codex uses `.codex/hooks.json` plus this `AGENTS.md` file.

Codex project skills live in `.agents/skills/`.

Claude Code uses `.claude/settings.json` plus `.claude/agents/spec-reviewer.md`.

Claude Code project skills live in `.claude/skills/`.

The `sdd-review-triage` skill is a manual decision aid, not an isolated-review hook. Hooks create or detect `agent-review` blocks; review triage is used afterward when deciding which findings must affect the Draft before acceptance.

Codex hooks currently detect missing or stale isolated reviews and instruct the main agent to spawn a reviewer. Claude Code may run the configured isolated reviewer directly when supported.

Every developer environment must trust or load its own hook configuration before relying on automated hook behavior.

## Client Project Initialization

Client repositories are generated with:

```bash
npm run client:init -- "Client Project Name" [target-parent-directory]
```

The initializer must create a clean client repository outside the template tree, copy reusable SDD process infrastructure, reset live specs to an empty accepted manifest, reset plans, changelogs and raw knowledge, create `RAW_PROJECT_KNOWLEDGE_CLIENT.md`, adapt package metadata and README content, validate before the initial Git commit, prepare `main` and `dev`, install hooks when possible and print first-push guidance.

Generated client repositories must use `templates/client-initialization-checklist.md` before first push.

Client projects do not keep template accepted specs in live `specs/` folders by default. They must create their own client raw knowledge and first client Global Spec before normal product implementation starts.

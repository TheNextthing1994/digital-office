---
name: sdd-review-triage
description: Binary triage of isolated `agent-review` findings on SDD Draft specs or Change Requests. Use when Codex must decide which review notes are critical enough to take into account before acceptance, and which notes should not be taken into account because they are merely important, nice-to-have, speculative, already covered, outside current scope, or not blocking current product behavior.
---

# SDD Review Triage

Use this skill after an isolated subagent has appended an `agent-review` block to a Draft `SPEC-*.md` or `CR-*.md`.

The job is not to accept the spec. The job is to help the human decide which review findings are critical enough to change before acceptance.

## Procedure

1. Read the target Draft spec or Change Request, including the final `agent-review` block.
2. Read `specs/accepted/manifest.json`.
3. Read directly referenced accepted specs from frontmatter `depends_on` and `related_specs`.
4. Read additional accepted specs only when a review finding claims contradiction, duplication, missing authority, or downstream coverage.
5. Read `docs/conventions.md` and `docs/agent-review-hooks.md` when the finding concerns SDD mechanics.
6. Classify every substantive review finding with exactly one of the two allowed binary decisions. Preserve the reviewer's categories only as source grouping; do not preserve them as classification levels.
7. Produce a concise triage report. Do not remove the `agent-review` block, add `review_resolution`, accept the spec, or move files unless the user explicitly asks for that next step.

## Classification

Use exactly these two labels:

- `Take Into Account`: the finding is critical enough to change the Draft before acceptance. Use only for direct contradictions, missing accepted authority, broken SDD mechanics, current-scope security/privacy/persistence/provider/access-control gaps, requirements that enable unsafe implementation now, or ambiguous language likely to produce wrong behavior now.
- `Do Not Take Into Account`: the finding should not change the Draft before acceptance. Use for everything else, including findings that are important but not critical, nice-to-have clarity, future or out-of-scope product modes, deployment-specific follow-up, implementation-plan details, speculative concerns, stylistic suggestions, concerns already covered by accepted authority or the Draft itself, and anything not connected to current software behavior.

There are no intermediate levels. Do not output labels like `Must Fix`, `Should Fix`, `Defer`, `Ignore`, `Critical`, `Important`, `Nice To Have`, or `Out Of Scope`.

If unsure, choose `Do Not Take Into Account` unless the finding has a concrete accepted-spec, SDD-process, or current-scope safety reason that would block acceptance or make current implementation unsafe.

## Relevance Heuristics

Classify as `Take Into Account` only when the finding is critical, such as:

- The reviewer identifies a direct contradiction with accepted specs or within the draft.
- The finding shows an implementation could violate privacy, security, persistence, provider, or access-control boundaries already accepted.
- The finding exposes missing authority required before current or near-term implementation can proceed.
- The finding catches vague normative language around current behavior, such as `must` vs `should` where security or data safety depends on it.
- The finding points to SDD process requirements: stale review, missing review metadata, manifest relationship mismatch, unresolved `agent-review`, missing `review_resolution`, or invalid frontmatter.

Classify as `Do Not Take Into Account` when the finding is not critical, including:

- The reviewer says there is no direct contradiction and suggests optional clarity.
- The finding is a future product capability already listed as out of scope.
- The finding asks for full production hardening when the draft only gates local or single-user work.
- The concern is already covered by an accepted spec, the draft text, or an explicit out-of-scope section.
- The concern would be better handled by an implementation plan validation item rather than a spec requirement.
- The finding proposes new product scope not required to make the current spec safe or coherent.
- The finding is important but not blocking.
- The finding is a nice-to-have improvement.

## Output Format

Use this shape unless the user asks for another format:

```markdown
**Triage Summary**

- Take Into Account: N
- Do Not Take Into Account: N

**Findings**

| Review finding | Classification | Why | Recommended action |
| --- | --- | --- | --- |
| Short paraphrase of finding | Take Into Account / Do Not Take Into Account | Cite the concrete spec authority or scope reason. | Patch now / do not patch now. |

**Recommended Next Step**

One or two sentences stating whether to patch the draft before acceptance or proceed without taking the rejected findings into account.
```

Keep paraphrases short. Do not paste long review text.

## Applying Changes

If the user asks to fix the draft after triage:

1. Patch only findings classified `Take Into Account`.
2. Do not patch findings classified `Do Not Take Into Account` unless the user explicitly overrides the triage.
3. After editing the draft, rerun the isolated spec-reviewer for only that draft because the content changed.

## Guardrails

- Do not let the isolated reviewer create scope by itself. Accepted specs, the draft's stated scope, and the human request control the decision.
- Do not dismiss direct contradictions or current security/privacy risks as "future work".
- Do not accept a Draft spec in this skill unless the user explicitly asks to accept it and the `sdd-spec-acceptance` skill is also used.
- Keep repository documents in English.

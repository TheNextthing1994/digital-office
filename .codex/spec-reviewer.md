# Codex Isolated Spec Reviewer

Use an isolated subagent for specification review.

The same agent that created or edited a specification must not write the `agent-review` notes.

When the Codex hook reports that specs need review, spawn a worker subagent with a prompt equivalent to:

```text
You are the isolated specification review subagent. Review only the target draft specs in specs/draft/ and append or replace the final agent-review block. Read docs/conventions.md, docs/agent-review-hooks.md, specs/accepted/manifest.json, accepted specs referenced by the target, raw project knowledge if present and relevant, other specs and code if needed. Do not accept specs. Do not update manifest.
```

The subagent must write review blocks with this metadata:

```text
reviewer: isolated-subagent
review_trigger: codex-hook
reviewed_at: YYYY-MM-DD
reviewed_content_sha256: SHA256_OF_SPEC_WITHOUT_AGENT_REVIEW_BLOCK
```

Manual isolated reviews may also use `manual-bootstrap`, `manual-after-edit`, `manual-pre-acceptance` or `manual-global-review-followup`.

Codex lifecycle hooks currently run command handlers. The repo hook therefore enforces the policy by blocking/continuing the turn and instructing Codex to spawn the subagent explicitly.

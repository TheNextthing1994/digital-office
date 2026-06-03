# Agent review hooks

This repository requires real isolated subagent review after creating or modifying any `specs/draft/SPEC-*.md` file.

The agent that creates or edits a spec must not write the review notes itself.

## Required review block metadata

Every review block must include:

```text
reviewer: isolated-subagent
review_trigger: <lowercase-kebab-case-trigger>
reviewed_at: YYYY-MM-DD
reviewed_content_sha256: <sha256-of-spec-without-agent-review-block>
```

`review_trigger` is a lowercase kebab-case token. Initial values are `codex-hook`, `claude-code-hook`, `manual-bootstrap`, `manual-after-edit`, `manual-pre-acceptance` and `manual-global-review-followup`.

Validation and hook checks report review blocks without this metadata according to the active validation mode and workflow context.

The hook does not rerun the reviewer on every draft every time. It asks for a targeted isolated review only when:

- a draft spec has no review block;
- the block was not produced by `isolated-subagent`;
- the block has no `reviewed_content_sha256`;
- the current spec content hash no longer matches `reviewed_content_sha256`.

A creation-time or edit-time review satisfies the final pre-acceptance review only when the hash still matches. If the spec changed after review, the isolated reviewer must rerun for that spec before acceptance.

A global rerun across all drafts is reserved for deliberate structural changes that invalidate all existing reviews.

## Codex

Codex loads project hooks from `.codex/hooks.json` when the project `.codex/` layer is trusted.

The Codex hook uses `scripts/spec-review-hook.js` as a command hook on `PostToolUse` and `Stop`.

Current Codex lifecycle hooks run command handlers. Agent handlers are parsed but skipped in the current release, so the Codex hook cannot directly execute an `agent` handler from `hooks.json`. The hook therefore blocks/continues the turn with explicit instructions to spawn an isolated subagent before continuing normal work.

The persistent Codex instruction is in `AGENTS.md`.

## Claude Code

Claude Code supports agent hooks on `PostToolUse`, so `.claude/settings.json` defines an agent hook for `Write|Edit|MultiEdit`.

The dedicated project subagent definition is `.claude/agents/spec-reviewer.md`.

Claude Code also runs a `Stop` command hook through `scripts/spec-review-hook.js` to detect any spec that still lacks isolated-review metadata.

## Manual bootstrap

During initial repository bootstrap, a human or main agent may create Draft specs, but a separate subagent must then replace any placeholder notes with real isolated review notes.

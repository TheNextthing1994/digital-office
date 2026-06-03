---
id: SPEC-FEATURE-001
type: FeatureSpec
status: Accepted
title: Shared collaborative workspace data
parent: SPEC-GLOBAL-001
depends_on: ["SPEC-GLOBAL-001"]
related_specs: []
work_area: features
---

# Shared collaborative workspace data

This feature defines the product's persistent, shared data layer and its collaboration and data-safety behavior, at the feature level. The concrete collection schemas and the enforcement mechanics (security rules) are defined by the data-model Technical specification that depends on this feature. This spec covers behavior and requirements, not rule syntax.

## User Goal

As a verified user, I want to capture and organize knowledge (notes, calendar items, a whiteboard, and knowledge cards on boards) that persists across sessions and is shared with the other verified members of the workspace, so the team works from one common, always-current dataset.

## Main Flow

1. The user signs in with a Google account whose email is verified.
2. The app loads the shared workspace data from the backend: Pinnwand notes, Whiteboard sticky notes and the central whiteboard document, and the VayBoard knowledge cards, boards, board items and agent events.
3. The user creates, edits, moves or deletes items (for example a note, a sticky note, a knowledge card, a board, or a board item).
4. Each change is persisted to the backend and becomes visible to every other verified user of the workspace.

## Alternate Flows

- Several verified users view and edit the same data concurrently; the workspace is a single shared dataset, so all of them see each other's items.
- The user creates different item variants: note categories (NOTE, TASK, PROCESS, KPI, FOKUS), knowledge cards from different sources (YOUTUBE, PDF, TEXT, VOICE, TEAM), and agent events for the strategy, creative or operations agents.

## Unfavorable Cases

- An unauthenticated user, or an authenticated user whose email is not verified, has no access to any workspace data (read or write).
- An input that exceeds the allowed size for its field must be rejected, so a single user cannot exhaust project resources ("denial of wallet").
- A write that adds fields outside the known schema, or changes a field to an unexpected type, must be rejected.
- A write that tries to alter a record's provenance after creation — its creation time, or, on the note collections that record one, its creator identity — must be rejected.

## Expected System Behavior

- The backend restricts all read and write access to authenticated accounts with a verified email; everything else is denied by default.
- The workspace data is shared: every verified user may read, create, update and delete items in the shared collections. This is the intended collaboration model for the current product (consistent with the accepted Global specification's "single common dataset"). The central whiteboard document is the one exception: it is permanent and is not deletable.
- Required data-safety behavior (target): every write to a shared collection must be constrained to that item type's known schema — bounded field sizes, expected types, and allowed enum values — and must reject foreign or unvalidated fields; a record's creation time must be immutable after creation; and where a record records a creator identity, that identity must be set from the authenticated user and must not change afterwards.
- Creator identity today: only the two note collections (Pinnwand notes and Whiteboard notes) record a creator bound to the authenticated user. The whiteboard document and the VayBoard collections (cards, boards, board items, agent events) currently record no creator identity; per-creator ownership is out of scope (see below).
- Current as-built coverage is partial: the required behavior above is enforced today only for the note collections and the whiteboard document; among the VayBoard collections, `cards` keep creation time immutable but lack size/foreign-field constraints, while `boards`, `boardItems` and `agentEvents` have no update validation at all (creation time can be rewritten, and `boardItems` has no creation time). Closing this gap to the required behavior is the purpose of the data-model Technical specification.
- The threat scenarios in `security_spec.md` (the "Dirty Dozen") are the source of these expectations, but that document today only covers the note collections and the whiteboard document; the data-model Technical specification extends the same protection to the VayBoard collections. One known open detail it must resolve is the Pinnwand `tags` field, which the current rules permit but do not validate.

## Out of Scope

- Per-user or per-team ownership and isolation (only the creator may edit or delete). This is a possible future direction and would require a client change plus a data migration; it is explicitly not part of this feature.
- The concrete collection schemas and the security-rule mechanics (defined by the data-model Technical specification).
- The user-interface behavior of each individual module (covered by separate feature specifications).
- The authentication provider and sign-in flow details.

<!-- review-resolution:start -->
review_resolution:
  agent_review_read: true
  agent_review_resolved_or_explicitly_ignored: true
  unresolved_agent_review_blocks_removed: true
  human_acceptance_confirmed: true
<!-- review-resolution:end -->

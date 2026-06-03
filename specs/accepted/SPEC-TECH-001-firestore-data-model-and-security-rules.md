---
id: SPEC-TECH-001
type: TechnicalSpec
status: Accepted
title: Firestore security rules hardening for the VayBoard collections
parent: null
depends_on: ["SPEC-FEATURE-001"]
related_specs: ["SPEC-GLOBAL-001"]
work_area: database
---

# Firestore security rules hardening for the VayBoard collections

## Functional Justification

This technical specification implements part of the data-safety behavior required by the accepted Feature spec `SPEC-FEATURE-001` (Shared collaborative workspace data) and the data-protection goal of the accepted Global spec `SPEC-GLOBAL-001`. It closes the concrete access-control gaps in the four VayBoard Firestore collections, which were added without the validation the note collections already have.

## Technical Scope

- The Firestore rules file `firestore.rules` (rules_version '2') for the database the app uses: project `gen-lang-client-0888260919`, named database `ai-studio-db4e1f11-7b01-482c-8858-c5f639421b94` (the app reads/writes this named database via `components/firebase.ts`).
- The live rules on that database were compared against the repository `firestore.rules` and are identical; the repository file is the source of truth and the current deployed baseline.
- In scope: the four collections `cards`, `boards`, `boardItems`, `agentEvents`.
- Out of scope (left unchanged, already hardened and live): `pinnwand_notes`, `whiteboard_notes`, `whiteboard_config`, the default-deny net, and all helper primitives. No client code change and no data migration.
- Access model is unchanged: shared among all verified users (read, list, create, update, delete) — only input validation is tightened.

## Data Model

The four in-scope collections (sources: `firebase-blueprint.json`, `types.ts`, and the actual writes in `components/FirebaseContext.tsx`):

- `cards/{id}` — VayBoardCard. Create writes `{...card, id, createdAt, updatedAt}`; update writes `{...partialCard, updatedAt}`. Fields: `id`, `title`, `sourceType` (YOUTUBE|PDF|TEXT|VOICE|TEAM), `createdAt`, `updatedAt`, and optional `sourceUrl`, `rawText`, `summary`, `tags` (array), `roles` (array of STRATEGY|CREATIVE|OPERATIONS), `projectRelevance`, `nextActions` (array), `status` (NEW|PROCESSED|ARCHIVED), `importance` (LOW|MEDIUM|HIGH).
- `boards/{id}` — VayBoardBoard. Create writes `{id, name, createdAt}`. The app has no board-update path; an update validator is added defensively. Fields: `id`, `name`, `createdAt`.
- `boardItems/{id}` — VayBoardBoardItem. Create writes `{...item, id}` (no `createdAt`). Update writes `{x, y}` (position) or an arbitrary subset of item fields (config). Fields: `id`, `boardId`, `x`, `y`, optional `cardId`, `width`, `height`, `groupId`, `groupColor`, `groupTitle`, `connectedTo` (array).
- `agentEvents/{id}` — VayBoardAgentEvent. Create writes `{...event, id, createdAt}`. Update writes `{status}` only. Fields: `id`, `agent` (STRATEGY|CREATIVE|OPERATIONS), `cardId`, `status` (PENDING|PROCESSED), `createdAt`, optional `triggerType`, `description`.

## API / Interfaces

All writes go through the central data layer `components/FirebaseContext.tsx`, which uses the named database. `id` is a client-generated string matching `isValidId`; `createdAt`/`updatedAt` are written with `serverTimestamp()` (resolves to `request.time`). The update key allow-lists below are taken directly from the fields those functions actually send, so no legitimate write is rejected.

## Security

General invariants stay as they are live today: default deny, verified-email required (`isVerified()`), `isValidId` for document ids, and shared read/list/create/update/delete for verified users. The hardening replaces the under-validated `create`/`update` rules of the four collections.

Per-collection requirements:

- `cards`
  - create: keys limited to the known card schema, which includes `updatedAt` (written as `serverTimestamp()`); `id`, `title` (<= 500), `sourceType` (enum) required and typed; `createdAt == request.time` and `updatedAt == request.time`; optional fields validated by type and size only when present; arrays bounded in length.
  - update: changed keys limited to `['title','sourceType','sourceUrl','rawText','summary','tags','roles','projectRelevance','nextActions','status','importance','updatedAt']`; `id` and `createdAt` immutable (`== resource.data.*`); `updatedAt == request.time`; present fields keep their type/size/enum constraints.
- `boards`
  - create: keys limited to `['id','name','createdAt']`; `name` is string (<= 200); `createdAt == request.time`.
  - update: changed keys limited to `['name']`; `name` typed and bounded; `id`/`createdAt` immutable.
- `boardItems`
  - create: keys limited to the known item schema; `boardId` string (<= 128), `x`/`y` numbers required; optional `cardId`/`width`/`height`/`groupId`/`groupColor`/`groupTitle`/`connectedTo` typed and bounded only when present.
  - update: changed keys limited to `['boardId','x','y','cardId','width','height','groupId','groupColor','groupTitle','connectedTo']`; `id` immutable; present fields keep type/size constraints.
- `agentEvents`
  - create: keys limited to the known event schema; `agent` (enum), `cardId` (string <= 128), `status` (enum PENDING|PROCESSED) required; `createdAt == request.time`; optional `triggerType`/`description` typed and bounded.
  - update: changed keys limited to `['status']`; `status` enum; `id`/`createdAt`/`agent`/`cardId` immutable.

Foreign fields are rejected because both create and update constrain the key set (`keys().hasOnly([...])` on create, `diff().affectedKeys().hasOnly([...])` on update). Optional fields are validated conditionally (`!('x' in data) || data.x is number`) so partial writes succeed.

Size ceilings are deliberately generous so they never reject a pre-existing document on a later update; they act only as an abuse backstop on top of Firestore's own ~1 MB document limit. Representative values (final values fixed in `firestore.rules`): `cards.summary` <= 50000, `cards.rawText` <= 900000, `cards.sourceUrl` <= 2000, `cards.projectRelevance` <= 10000, `cards.tags`/`roles`/`nextActions` arrays <= 500 entries, `agentEvents.description` <= 10000, `agentEvents.triggerType` <= 500, `boardItems` group strings <= 500, `boardItems.connectedTo` <= 1000 entries.

Threat coverage: this extends the relevant `security_spec.md` "Dirty Dozen" protections to the four VayBoard collections — anonymous/unverified access, ghost-field / shadow-update, oversized payloads, malicious id, creation-time spoofing, and type spill are all rejected. Identity-spoofing items do not apply because these collections intentionally record no per-user owner (shared model).

## Performance

Constant-time per request (field reads, comparisons, one `diff().affectedKeys()` per update). No extra document reads (`get()`/`exists()` are not used).

## Migration / Operations

- No data migration. Tightened update validators apply to future writes; existing documents are not rewritten, and the generous size ceilings ensure updates to pre-existing documents still pass.
- Deployment: publish through the Firebase Console for project `gen-lang-client-0888260919` against the **named database `ai-studio-db4e1f11-7b01-482c-8858-c5f639421b94`** (not the default database) — Firestore Database -> select that database -> Rules -> paste -> Publish. Setting up `firebase.json` for CLI deploy is an optional follow-up.
- Verification after publish: creating/editing/moving a VayBoard card or item still works; a foreign field, an oversized payload, or a changed `createdAt` is rejected with `PERMISSION_DENIED`.

## Known Separate Issues (not addressed here)

- The OpsAgentView and StrategyAgentView "LOCAL_GATEWAY" feature writes `whiteboard_config/local_gateway_jobs` and `local_gateway_status` with off-schema fields, which the already-live `whiteboard_config` rules reject; additionally the downloadable gateway script targets the default database rather than the named one. This is a pre-existing defect independent of this hardening and is left for a separate plan. The `whiteboard_config/ops_agent_projects` sync, by contrast, conforms (it stores data in the `text` field) and keeps working.

<!-- review-resolution:start -->
review_resolution:
  agent_review_read: true
  agent_review_resolved_or_explicitly_ignored: true
  unresolved_agent_review_blocks_removed: true
  human_acceptance_confirmed: true
<!-- review-resolution:end -->

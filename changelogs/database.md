# Changelog - Database

## 2026-06-03 - SPEC-TECH-001 - Firestore data model and VayBoard rules hardening defined

- Branch/PR: `dev`
- Work area: `database`
- Impacted areas: None
- Spec refs: SPEC-TECH-001
- Change request refs: None
- Summary: Documented the Firestore data model (sources: firebase-blueprint.json, types.ts, FirebaseContext.tsx) and accepted the target hardened security rules for the four VayBoard collections (cards, boards, boardItems, agentEvents). Live rules confirmed identical to the repository baseline. Implemented the hardening in `firestore.rules`: per-collection create/update key whitelists (`keys().hasOnly` / `diff().affectedKeys().hasOnly`), type/enum validation, conditional optional-field checks, generous size ceilings, immutable `createdAt`/`id`. Notes and `whiteboard_config` left unchanged. Allow-lists match the exact write payloads in FirebaseContext so no legitimate write is rejected.
- Tests/validations: `npm run validate` (pass), `npm run lint` (pass). Rules syntax is validated by the Firebase Console on publish (no local Firebase CLI).
- Human verification: Pending — publish to the named database via the Firebase Console and confirm a normal card edit works while a foreign/oversized field is denied.
- Manual operations: Console publish of `firestore.rules` to database `ai-studio-db4e1f11-7b01-482c-8858-c5f639421b94` (pending).

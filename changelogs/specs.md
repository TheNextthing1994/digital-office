# Changelog - Specs

## 2026-06-03 - SPEC-TECH-001 - Accept Firestore VayBoard rules-hardening technical spec

- Branch/PR: `dev`
- Work area: `specs`
- Impacted areas: `database`
- Spec refs: SPEC-TECH-001, SPEC-FEATURE-001, SPEC-GLOBAL-001
- Change request refs: None
- Summary: Derived and accepted the Technical spec that hardens the Firestore security rules for the four under-validated VayBoard collections (cards, boards, boardItems, agentEvents): key whitelists, type/enum/size validation, immutable createdAt, foreign-field rejection — keeping the shared access model. Two isolated review rounds: the first caught that whiteboard_config is a multi-purpose store (so scope was narrowed and whiteboard_config/notes left unchanged); a live-rules comparison confirmed live == repo; the re-review's cards-create updatedAt finding was taken into account. depends_on the accepted SPEC-FEATURE-001 as required for an accepted TechnicalSpec.
- Tests/validations: `npm run validate`, `npm run review:hook`
- Human verification: Human approved the security plan and the narrowed scope after the live-rules comparison.
- Manual operations: None

## 2026-06-03 - SPEC-FEATURE-001 - Accept shared collaborative workspace data feature spec

- Branch/PR: `dev`
- Work area: `specs`
- Impacted areas: `database`
- Spec refs: SPEC-FEATURE-001
- Change request refs: None
- Summary: Derived and accepted the first Feature spec, covering the shared, persistent workspace data layer (notes, whiteboard, VayBoard cards/boards/items, agent events): verified-only access, a single shared dataset collaboration model, and the required data-safety behavior (schema constraints, size bounds, immutable provenance). Two isolated review rounds; findings about overstated present-tense guarantees were taken into account and the protections reframed as target behavior with an explicit partial-coverage statement. This Feature spec is the functional justification for the upcoming data-model Technical spec.
- Tests/validations: `npm run validate`, `npm run review:hook`
- Human verification: Human approved the security-hardening plan that authorized deriving and accepting this spec.
- Manual operations: None

## 2026-06-03 - SPEC-GLOBAL-001 - Accept first Digital Office Global Spec (bootstrap exit)

- Branch/PR: `dev`
- Work area: `specs`
- Impacted areas: `repository`
- Spec refs: SPEC-GLOBAL-001
- Change request refs: None
- Summary: Derived and accepted the first client Global Spec for the Digital Office product from the as-built baseline. The draft went through an isolated subagent review and a re-review after edits; the security-overclaim, wiring-accuracy, altitude and collaboration findings were taken into account and patched before acceptance. The accepted manifest now declares SPEC-GLOBAL-001, which ends the empty-manifest bootstrap state.
- Tests/validations: `npm run validate`, `npm run review:hook`, `npm run validate:pre-commit`, `npm run validate:pre-push`, `npm run validate:ci`
- Human verification: Human approved the bootstrap plan that authorized deriving and accepting this Global Spec.
- Manual operations: None

# Security Specification: Shared Collaborative 3D Board Hub

This specification details the security invariants and testing cases for the Firestore collections to ensure safety against identity spoofing, resource exhaustion, and unauthorized updates.

## 1. Data Invariants

- **Authentication Mandate**: Access to all collections (`pinnwand_notes`, `whiteboard_notes`, `whiteboard_config`) is strictly restricted to authenticated users with a verified Google email address (`request.auth.token.email_verified == true`).
- **Creator Identity Integrity**: In both `pinnwand_notes` and `whiteboard_notes`, the `userId` property must be strictly bound to `request.auth.uid` during creation and remains immutable.
- **Strict Size/Length Bound**: Text bounds must be restricted to prevent "Denial of Wallet" resource exhaustion:
  - `pinnwand_notes` text: `is string` and less than or equal to 1000 characters.
  - `whiteboard_notes` text: `is string` and less than or equal to 500 characters.
  - `whiteboard_config` text: `is string` and less than or equal to 50000 characters.
- **Immutable Fields**: `createdAt` and `userId` cannot be modified under any update action.
- **Valid ID Structure**: IDs of documents must follow custom pattern: alphanumeric, dash, and underscores, up to 128 characters.

## 2. The "Dirty Dozen" Threat Payloads (Verification Matrix)

These payloads are designed to challenge our rules and must be strictly blocked by Firestore rules:

1. **Anonymous Read**: Unauthenticated user attempts to get or list any notes.
2. **Unverified Email Edit**: Authenticated user whose email is not verified (`email_verified: false`) tries to write.
3. **Identity Spoofing on Create**: User `alice_uid` tries to create a sticky note stating `userId: "bob_uid"`.
4. **Identity Spoofing on Update**: User `bob_uid` tries to update `alice_uid`'s note to set `userId: "bob_uid"`.
5. **Creation Timestamp Spoofing**: Client attempts to submit a custom/pre-dated `createdAt` timestamp instead of `request.time`.
6. **Update Timestamp Spoofing**: Client attempts to submit a modified `updatedAt` timestamp instead of `request.time`.
7. **Ghost Schema Expansion (Shadow Update)**: User tries to write an update adding an unvalidated `isRootAdmin: true` field.
8. **Malicious ID injection**: User tries to create a document with ID `../../some/illegal/path` or excessively long ID of 1KB.
9. **Extremely Large Text Attack**: User tries to post a 5MB note to exhaust project resources.
10. **Immutable Fields Modification**: User tries to change `createdAt` of a note from 10:00 to 11:00 on update.
11. **Whiteboard Color Modification Poisoning**: User tries to submit a non-hex color or non-string color (e.g. `color: true`).
12. **Coordinate Spill Attack**: User tries to set Sticky note coordinates `x` or `z` to massive out-of-bound numbers or non-number types.

## 3. Test Cases Implementation Plan
The following ruleset in `firestore.rules` enforces that all twelve attack scenarios result in `PERMISSION_DENIED` errors at the firewall layer.

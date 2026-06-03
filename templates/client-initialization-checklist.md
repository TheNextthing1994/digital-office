# Client Project Initialization Checklist

Use this checklist immediately after generating a client repository from the template.

## Generate The Client Repository

- [ ] From the template repository, run:

```bash
npm run client:init -- "Client Project Name"
```

- [ ] Use an optional target parent directory when the generated folder should not be created next to the template:

```bash
npm run client:init -- "Client Project Name" ../clients
```

- [ ] Confirm the target parent directory is outside the template repository tree.
- [ ] Confirm the generated folder name matches the safe project slug.
- [ ] Open the generated client repository folder before making client-specific edits.

## Repository Identity

- [ ] Confirm `README.md` contains the client project name and onboarding commands.
- [ ] Confirm `package.json` uses the client project slug and client description.
- [ ] Keep command and validation references in `README.md` unless equivalent onboarding docs replace them later.
- [ ] Confirm all project documents remain in English.

## Git And Branches

- [ ] Confirm Git was initialized or record the manual follow-up shown by the script.
- [ ] Confirm `main` exists as the production branch.
- [ ] Create or update `dev` as the shared development branch.
- [ ] Confirm future work starts from `dev`.
- [ ] Resolve any hook-install manual follow-up before first push.
- [ ] If an approved manual validation workflow is used before a client plan exists, record it in the active raw knowledge and migrate it into the first governing spec, plan or changelog entry.
- [ ] Add the Git remote when it exists.
- [ ] Push `main` and `dev` after validating the generated repository:

```bash
git push -u origin main
git push -u origin dev
```

## Hooks And Validation

- [ ] Run `npm run validate`.
- [ ] Install Git hooks with `npm run hooks:install` when Git is available.
- [ ] Confirm Codex hook trust if Codex is used.
- [ ] Confirm Claude Code hook trust if Claude Code is used.

## Template History

- [ ] Confirm template completed plans were removed from `plans/done/` or archived outside live plan folders.
- [ ] Confirm `plans/active/` is empty.
- [ ] Confirm client-facing changelog files were reset or template history was archived as non-client provenance.
- [ ] Keep reusable changelog files and area headings.
- [ ] Record initialization decisions as the first client changelog entry only when an accepted governing spec or client initialization plan exists.

## Raw Knowledge

- [ ] Confirm the template raw knowledge file is not active in `project-knowledge/raw/`.
- [ ] Confirm `project-knowledge/raw/RAW_PROJECT_KNOWLEDGE_CLIENT.md` exists or replace it with an external raw knowledge pointer.
- [ ] Confirm who owns the active client raw knowledge source.
- [ ] If raw knowledge is external, record who can mark it inactive for bootstrap exit.
- [ ] Confirm whether confidential raw knowledge may be committed.

## Specs

- [ ] Confirm live `specs/` contains only `specs/README.md`, `specs/accepted/README.md`, `specs/accepted/manifest.json` and `specs/draft/README.md`.
- [ ] Confirm `specs/accepted/manifest.json` contains only `schema_version: "1.0.0"` and an empty `specs` array.
- [ ] Confirm template accepted specs, accepted Change Requests, Draft specs and Change Request drafts are not present in live `specs/` folders.
- [ ] Keep retained examples outside `specs/` and mark them non-authoritative.
- [ ] Create the first client Global Spec from client raw knowledge.
- [ ] Use `SPEC-GLOBAL-001` for the first client Global Spec unless the generated client already contains an accepted Global Spec.
- [ ] Use `parent: null` and `depends_on: []` for the first client Global Spec unless a deliberate custom migration says otherwise.
- [ ] Run isolated review before accepting any client spec.
- [ ] Do not use Change Requests before the first accepted client spec exists because there is no accepted target spec yet.

## Final Check

- [ ] Run `npm run validate`.
- [ ] Confirm initialization decisions are recorded in the repository changelog only when an accepted governing spec or client initialization plan exists.

# Changelog - Repository

## 2026-06-03 - SPEC-GLOBAL-001 - Publish repository to GitHub

- Branch/PR: `dev`
- Work area: `repository`
- Impacted areas: None
- Spec refs: SPEC-GLOBAL-001
- Change request refs: None
- Summary: Created a public GitHub repository `TheNextthing1994/digital-office` and pushed `main` and `dev`. A secret scan confirmed no credentials are tracked (`.env.local` is gitignored; the real Gemini key is in no commit). The committed `firebase-applet-config.json` is the public Firebase web config. Follow-ups: restrict the Firebase web API key and harden the Firestore rules.
- Tests/validations: `npm run validate`
- Human verification: Repository visible on GitHub with both branches.
- Manual operations: `gh repo create digital-office --public`; `git push -u origin main`; `git push -u origin dev`.

## 2026-06-03 - SPEC-GLOBAL-001 - Bootstrap import of Digital Office product baseline

- Branch/PR: `dev`
- Work area: `repository`
- Impacted areas: `frontend`
- Spec refs: SPEC-GLOBAL-001
- Change request refs: None
- Summary: Generated this client repository from the SDD template (`client:init`) and imported the existing Digital Office application (React 19 + Vite + Three.js + Firebase + Gemini) from its Google AI Studio export as the as-built baseline. Merged the product `package.json` into the SDD `package.json` without `"type":"module"` so the CommonJS SDD scripts keep working; added `.gitignore` and `.env.example`; excluded the German prompt-history artifact. Initialized Git on `main`, installed hooks, and created `dev`.
- Tests/validations: `npm install`, `npm run lint`, `npm run build`, `npm run validate`
- Human verification: Human approved the integration approach (client:init), the project name "Digital Office", and the scope (bootstrap to first accepted Global Spec).
- Manual operations: Imported product source from `digital-büro.zip`; `firebase-applet-config.json` (public Firebase web config) committed, with a follow-up to add API key restrictions; `GEMINI_API_KEY` kept in gitignored `.env.local`.

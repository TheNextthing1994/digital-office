# Raw project knowledge - Digital Office

This temporary document contains everything known about the client project before the specifications are complete.

It is not an accepted specification and must not be used as implementation authority after bootstrap mode ends.

This knowledge was reverse-engineered from the as-built product code imported from a Google AI Studio export. Authoritative in-repo inputs already exist and should be read when writing specs:

- `firebase-blueprint.json` (Firestore data entities and collections)
- `firestore.rules` and `security_spec.md` (security model and threat matrix)
- `types.ts` (shared TypeScript domain types)
- `metadata.json` (AI Studio app metadata and requested frame permissions)

## Client Brief

Digital Office is a single-page web application that presents an interactive 3D AI workspace ("digital office"). The user enters a navigable 3D studio environment and, from inside it, reaches a set of productivity and AI modules. The product was prototyped in Google AI Studio and is now being moved under Specification-Driven Development for continued work.

Naming history (the product evolved past its early names):
- AI Studio `metadata.json` name: "Konferenz HUB".
- `package.json` (original) name: "3d-podcast-studio-ai".
- `index.html` title: "3D AI Podcast Creator".
- Chosen project name going forward: "Digital Office".

## Business Context

The application combines two capability groups in one 3D space:

1. AI conversation/podcast studio. The entry view (`App.tsx`) drives a structured spoken dialogue between two personas, "Chief of Staff" (an authoritative strategic advisor) and "Player" (the user). It generates a script with Gemini, synthesizes speech, supports live intervention, custom-text-to-script conversion, theater mode, screen sharing and screen recording.
2. Collaborative office modules. Reached from the 3D studio via the in-scene desktop dashboard and board surfaces:
   - VayBoard: a Milanote-style knowledge canvas of AI-analyzed cards on boards.
   - AI agents: Strategy, Creative and Operations agent views, plus agent-triggered events.
   - Pinnwand and Kalender: a shared board of notes/tasks/process/KPI/focus items with week labels.
   - Whiteboard: a collaborative sticky-note board (2D and 3D) with a central shared document.

As-built wiring (verified by reading the code, corrected after isolated review): `App.tsx` renders `StudioScene` with `isTheaterMode` hardcoded to true. On the non-VR path, `StudioScene` mounts a 2D full-screen `DesktopDashboard` overlay that hosts Pinnwand, Whiteboard, OpsAgentView, StrategyAgentView, CreativeAgentView, RoadmapView and VayBoardCanvas. On the VR / simulated-VR path, the in-scene 3D board mounts only Pinnwand/Kalender, Whiteboard and `AgentenTisch`. Therefore VayBoard, Roadmap and the agent views are reachable through the 2D overlay, not inside the 3D scene. `WorldSpaceUI` provides in-world controls; `Cowboy` and `Soldier` are 3D avatars. Note: `askIntervention` is imported in `App.tsx` but never invoked (effectively dead code); live intervention uses `connectToLiveSession`.

Tech stack: React 19, TypeScript 5.8, Vite 6, Three.js with `@react-three/fiber`, `@react-three/drei`, `@react-three/xr` (WebXR), Firebase 12 (Firestore + Auth), `@google/genai` (Gemini), `recharts`, `motion`, `nipplejs` (on-screen joystick), `lucide-react`, Tailwind (loaded via CDN in `index.html`). The AI Studio runtime also used an ESM `importmap` in `index.html`; the local build uses the npm dependencies via Vite.

Gemini models referenced in `services/geminiService.ts` (all preview/dated ids): `gemini-3-pro-preview`, `gemini-3-flash-preview`, `gemini-2.5-flash-preview-tts`, `gemini-3.1-flash-live-preview`, `gemini-3.5-flash`. Service functions: `generatePodcastScript`, `generateSpeech`, `askIntervention`, `formatCustomTextToScript`, `connectToLiveSession`, `analyzeKnowledgeInput`, `generateAgentCommentary`, `queryInboxWithQuestion`.

Backend: Firebase project `gen-lang-client-0888260919`, Firestore database id `ai-studio-db4e1f11-7b01-482c-8858-c5f639421b94`. Firestore collections (see `firebase-blueprint.json`): `pinnwand_notes`, `whiteboard_notes`, `whiteboard_config`, `cards`, `boards`, `boardItems`, `agentEvents`.

Authentication: Google sign-in through Firebase. The security model requires a verified Google email (`email_verified == true`). `FirebaseContext` exposes `user`, `loading`, `signInWithGoogle`, `logout`.

## Users

- Primary user: a single operator/owner who uses the 3D office for strategic thinking, knowledge capture and AI-assisted dialogue.
- Collaborative intent: several Firestore collections are explicitly described as "shared" and "collaborative" (Pinnwand, Whiteboard, boards), so multiple authenticated users are an intended scenario.
- Access is restricted to authenticated users with a verified Google email.

## Geography

- Not formally defined. The UI contains German strings (product copy), and `index.html` declares `lang="de"`. Repository documentation, specs and JSON documentation fields must remain English per SDD conventions; product UI language is a separate product decision to be captured in feature specs.

## Ideas

- A single 3D "office" as the shell that unifies an AI dialogue studio and several collaborative knowledge tools.
- Agent-driven automation: `agentEvents` triggers Strategy/Creative/Operations agents when new knowledge is synthesized.
- Voice-actor feature: dialogue entries can carry a user recording (`DialogueEntry.userRecordingUrl`).
- WebXR/spatial use (frame permissions request `microphone` and `xr-spatial-tracking`).

## Decisions

- Integration approach: generate a clean client repository with `npm run client:init` and import the product as the as-built baseline (template stays reusable). Confirmed with the human on 2026-06-03.
- Project name: "Digital Office" (slug `digital-office`).
- First-run scope: bring the repo to bootstrap-exit by deriving and accepting the first Global Spec; feature and technical specs follow in later plans.
- Secrets handling:
  - `GEMINI_API_KEY` lives in `.env.local` (gitignored), read via `vite.config.ts`. Never committed.
  - `firebase-applet-config.json` (Firebase web config including `apiKey`) is committed. Firebase web API keys are public client identifiers, not secrets; access is enforced by `firestore.rules` and authentication. Follow-up: restrict the key in the Google Cloud console.
- Build/package decision: the root `package.json` intentionally does not set `"type":"module"` so the CommonJS SDD scripts keep working; Vite does not require it.
- The German prompt-history export (`migrated_prompt_history/`) was not imported, because its German text trips the language validator's heuristic and it is a dev artifact.

## Hypotheses

- The product's center of gravity has shifted from "AI podcast studio" toward "collaborative AI office"; the Global Spec should describe the office as the whole, with the studio as one module.
- Multiple earlier AI Studio prototypes may have been merged into this one app; the breadth of modules suggests consolidation.
- Collaboration is intended but the depth of multi-user real-time behavior (presence, conflict handling) is not yet confirmed from code.

## Open Questions

- Which modules are considered in-scope product features vs experiments? (All are wired, but priority is unknown.)
- Is the primary purpose the AI dialogue studio, the collaborative office, or both equally?
- What is the intended multi-user model (private per-user data vs shared team workspace)? Several collections are "shared" but rules bind `userId` to the creator.
- Should the product UI be localized to English, kept German, or made bilingual?
- Which Gemini model tier is the long-term target (the code uses preview model ids)?
- Are the two `.glb` avatar assets (~6 MB each) final, and should they move to Git LFS?

## Notes To Not Forget

- Authoritative security expectations already exist in `security_spec.md` (the "Dirty Dozen" threat matrix) and `firestore.rules`; the future TechnicalSpec for the data model and rules should trace to them.
- An accepted `TechnicalSpec` must depend on or relate to at least one accepted `FeatureSpec`/`SubFeatureSpec` (validator rule), so feature specs must come before or with the data-model technical spec.
- `npm run lint`, `npm run build` and `npm run validate` all pass on the imported baseline (recorded at import time).
- AI Studio app reference: https://ai.studio/apps/db4e1f11-7b01-482c-8858-c5f639421b94
- Some scope items are partial in the as-built app: the `KPI` Pinnwand category exists in the data model and rules but no UI path creates KPI notes (UI produces NOTE/TASK/PROCESS/FOKUS); a "Scout" (RECHERCHE) agent is marked "coming soon" in the UI and has no view. Record real status when writing the agent and notes feature specs.
- The product persists state under legacy `konferenzhub.*` localStorage keys and a fixed Firebase project/database id. Renaming the project to "Digital Office" does NOT by itself imply changing those keys/identifiers; any such migration needs its own migration plan/spec to avoid regressing persisted state and preferences.

# Changelog - Frontend

## 2026-06-03 - SPEC-GLOBAL-001 - Clean up AI Studio leftovers and enable dev-tunnel access

- Branch/PR: `dev`
- Work area: `frontend`
- Impacted areas: None
- Spec refs: SPEC-GLOBAL-001
- Change request refs: None
- Summary: Removed leftovers from the AI Studio origin: dropped the dead `<link rel="stylesheet" href="/index.css">` in `index.html` (the file never existed; styling comes from the Tailwind CDN and inline styles) and renamed the document `<title>` from "3D AI Podcast Creator" to "Digital Office"; removed the unused `askIntervention` import in `App.tsx` (live intervention uses `connectToLiveSession`). Added `allowedHosts: ['.devtunnels.ms']` to `vite.config.ts` so the app is reachable through VS Code dev tunnels for remote viewing.
- Tests/validations: `npm run lint`, `npm run build`, `npm run validate` (all pass).
- Human verification: App reloaded through the VS Code dev tunnel; loads without the index.css console error.
- Manual operations: None
## 2026-06-03 - SPEC-GLOBAL-001 - Remove experimental 3D avatar prototype (Cowboy/Soldat)

- Branch/PR: `dev`
- Work area: `frontend`
- Impacted areas: None
- Spec refs: SPEC-GLOBAL-001
- Change request refs: None
- Summary: Removed the experimental 3D character avatars that were a proof-of-concept for loading GLB models with bundled animations. Deleted `components/Cowboy.tsx`, `components/Soldier.tsx`, and the `public/Soldat.glb` + `public/Meshy_AI_Meshy_Merged_Animations.glb` assets (the now-empty `public/` folder is gone); removed the avatar imports and render blocks in `components/StudioScene.tsx`; and dropped the "(Cowboy)"/"(Soldat)" naming references in `components/VayBoardCanvas.tsx`. The Strategy/Creative/Operations agents themselves are unchanged.
- Tests/validations: `npm run lint`, `npm run build`, `npm run validate` (all pass; build dropped from 3634 to 3632 modules).
- Human verification: Pending user reload of http://localhost:3000 to confirm the 3D scene renders without the avatars.
- Manual operations: None

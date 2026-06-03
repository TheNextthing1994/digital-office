# Changelog - Frontend

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

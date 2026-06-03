# Digital Office

This repository was initialized from the Specification-Driven Development template. It now also hosts the Digital Office product application (a 3D AI workspace), imported as the as-built baseline from a Google AI Studio export. SDD governance and the product code live side by side: governance lives in `specs/`, `plans/`, `changelogs/`, `docs/`, `templates/`, `scripts/` and `hooks/`; the product lives at the repository root (`App.tsx`, `index.tsx`, `components/`, `services/`, `public/`).

## Local App

The product is a React 19 + TypeScript + Vite app using Three.js, Firebase and the Gemini API.

**Prerequisites:** Node.js.

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env.local` and set `GEMINI_API_KEY` to your Gemini API key.
3. Run the app: `npm run dev`
4. Type-check / build: `npm run lint` and `npm run build`.

## First Step

> Note: the as-built baseline import and the first Global Spec are already in place. The instructions below are the template's default first-run guidance.

Fill the active raw knowledge file:

Fill the active raw knowledge file:

```text
project-knowledge/raw/RAW_PROJECT_KNOWLEDGE_CLIENT.md
```

Then create the first client Global Spec from that raw knowledge.

## Commands

```bash
npm run validate
npm run validate:pre-commit
npm run validate:pre-push
npm run validate:ci
npm run review:hook
npm run hooks:install
```

## Initialization Checklist

Use this checklist before the first push:

```text
templates/client-initialization-checklist.md
```

## Workflow

- `main` is production.
- `dev` is shared development.
- The generated repository starts with no accepted specs.
- SDD workflow mechanics come from copied operational files: scripts, hooks, templates, docs, agent instructions and package commands.
- Product implementation work must wait for accepted client specs or use a controlled bootstrap `OFFSPEC` exception limited to initialization or first-spec preparation.

## First Push

Run these only after validation passes, hook installation is ready or an approved manual validation workflow is recorded, and the initialization checklist is complete.

```bash
git remote add origin <remote-url>
git push -u origin main
git push -u origin dev
```

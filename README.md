# Digital Office

This repository was initialized from the Specification-Driven Development template.

## First Step

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

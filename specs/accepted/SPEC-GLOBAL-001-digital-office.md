---
id: SPEC-GLOBAL-001
type: GlobalSpec
status: Accepted
title: Digital Office global specification
parent: null
depends_on: []
related_specs: []
work_area: specs
---

# Digital Office global specification

This is the first accepted client specification for the Digital Office product. It establishes product authority at the global level after the bootstrap import of the as-built application. It describes what the product is and its macro functional scope, without implementation details. Module-level behavior is deferred to later Feature and Technical specifications.

## Purpose

Digital Office exists to give a knowledge worker one place that combines AI-assisted thinking with collaborative knowledge tools. The entry experience is an AI dialogue studio presented in a 3D scene; from the same application the user also reaches office modules (knowledge cards and boards, a notes board with calendar, and a shared whiteboard) through an in-app dashboard. The product turns unstructured input and conversation into organized, reviewable knowledge and actions, so the user does not have to switch between separate apps.

## Client

The product was prototyped by the owner in Google AI Studio and is now maintained under Specification-Driven Development. It is a web application built with React, TypeScript and Vite, rendering a 3D environment with Three.js, backed by Firebase (Firestore and Authentication) and using the Google Gemini API for generative features. The product was previously labeled "Konferenz HUB" / "3D AI Podcast Creator"; its governing name going forward is "Digital Office".

## Users

- Primary user: the owner/operator who uses the 3D office for strategic thinking, knowledge capture and AI-assisted dialogue.
- Collaborators: additional authenticated people. In the as-built product, verified accounts share a single common dataset; finer-grained sharing, ownership and permission models are an intended direction whose detailed design is left to Feature and Technical specifications.
- Access requires authentication with a verified Google email. Unauthenticated and unverified users have no access.

## Usage Context

- Delivered as a browser-based single-page application; the user signs in with Google.
- The application opens into the AI dialogue studio rendered in a 3D scene.
- The office modules are reached through an in-app dashboard (a full-screen overlay); some board modules can also render inside the 3D scene. The exact per-module reachability is defined by Feature specifications.
- Persistent data lives in Firestore and is shared across sessions and, where applicable, across authenticated collaborators.
- The environment may be used with a microphone and supports spatial/WebXR contexts (the app requests `microphone` and `xr-spatial-tracking` permissions).

## Goals

- Provide one coherent workspace that brings AI dialogue and collaborative knowledge tools together.
- Let the user generate and run structured AI dialogue (the "Chief of Staff" advisor and the "Player"), including speech and live intervention.
- Let the user capture, classify and organize knowledge into cards and boards, with AI assistance and agent-driven follow-ups.
- Provide shared, persistent collaboration surfaces (notes board with calendar, sticky-note whiteboard) for authenticated users.
- Restrict all stored data to authenticated accounts with a verified Google email. The detailed data-protection rules (creator binding, field immutability, input bounds) and their current coverage and gaps are defined by the data-model Technical specification, not asserted as already-complete here.
- Continue all future product work under SDD: changes flow through accepted specifications, plans, validation and changelogs.

## Macro Functional Scope

The following major functional areas exist in the as-built product. Each will be detailed in its own Feature specification; this list defines scope only.

- 3D studio environment: a navigable 3D scene that hosts the studio and serves as the visual shell of the product.
- AI dialogue studio: AI-generated, persona-based spoken dialogue with the user, plus supporting capture utilities.
- Knowledge organization: AI-assisted capture and arrangement of knowledge into cards and boards.
- AI agents: assistant roles (strategy, creative, operations) and the events that drive their follow-ups.
- Shared notes and calendar: a collaborative board of dated notes and tasks.
- Shared whiteboard: a collaborative space for sticky notes and a shared document.
- Identity and access: authentication restricted to verified-email accounts.
- Data and security model: the persisted data and the access and security rules that protect it. The concrete collections, rules, current coverage and known gaps are defined by the data-model Technical specification (informed by `firebase-blueprint.json`, `firestore.rules` and `security_spec.md`).

Out of scope at the global level: implementation details, module-internal behavior, data schemas and security rule mechanics. These belong to Feature and Technical specifications that depend on this Global specification.

<!-- review-resolution:start -->
review_resolution:
  agent_review_read: true
  agent_review_resolved_or_explicitly_ignored: true
  unresolved_agent_review_blocks_removed: true
  human_acceptance_confirmed: true
<!-- review-resolution:end -->

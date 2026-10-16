# Proposal

## Why

Tigy's art commissions currently have no home: there is no place to show the pieces together with credit to the artists who made them. The plan is a gallery: a public site where visitors browse and download the art and find the artists, and a private admin where the owner uploads images and enters their details.

Before any feature can be built, the gallery needs a platform to run on: a Firebase project, a workspace for the apps, a way to develop locally, proof that the riskiest parts of the architecture work, and an automated path from a push to a deployed site. This change sets that up, so that every feature change after it only has to build its feature.

## What Changes

- **Firebase project** (Blaze plan) with Firestore, Storage and Functions in Zurich (`europe-west6`), App Hosting in the Netherlands (`europe-west4`), Google sign-in, and budget alerts.
- **Nx workspace** with `apps/public` (Angular with server-side rendering), `apps/admin` (Angular single-page app), `apps/functions`, a shared `libs/models`, and a `firebase` project for rules and indexes, plus the local Emulator Suite.
- **Spikes S1-S5** run in the real project to prove token URLs, edge caching, keyless deploys, App Hosting with current Angular/Nx, and lossless metadata stripping.
- **Automated delivery**: every push to `main` builds, tests and deploys whatever changed (Nx affected) through one GitHub workflow.

This change adds no user-facing behaviour and has no spec deltas (`skip_specs`). The gallery's features follow as separate changes, in this order:

1. `add-image-upload`: the owner signs in and uploads images, which are processed into downloadable masters and web versions.
2. `add-public-gallery`: the owner edits, publishes and deletes images; visitors browse, open and download them.
3. `add-nsfw-handling`: the "show NSFW" switch, the confirm screen, and keeping NSFW images out of search.
4. `add-artists`: artist records, credits and artist pages, then the launch checks.

Out of scope for all of them: visual design, layout and browsing UI details (sorting/filter controls, infinite scroll vs. "load more", footer notice, cookie banner), custom domain, App Check, video commissions, multiple admins. These belong to a separate UI/UX change or later work.

## Capabilities

### New Capabilities

None. This change is infrastructure only.

### Modified Capabilities

None.

## Impact

- **Repository**: a new Nx workspace layout with `apps/public`, `apps/admin`, `apps/functions`, a shared `libs/models`, and a `firebase` project for rules and indexes.
- **Firebase (new project `tigy-165cc`, Blaze plan)**: Firestore, Cloud Storage and Cloud Functions in Zurich (`europe-west6`); App Hosting in the Netherlands (`europe-west4`); Firebase Hosting for the admin; Firebase Auth with Google sign-in.
- **Dependencies**: Angular with `@angular/ssr`, Firebase JS SDK, Firebase Admin SDK, Firebase CLI in CI.
- **CI/CD**: a GitHub Actions workflow with keyless Google Cloud auth (Workload Identity Federation); App Hosting's own automatic rollouts turned off.
- **Cost**: expected to stay in cents per month at personal-gallery traffic; budget alerts guard against spikes.

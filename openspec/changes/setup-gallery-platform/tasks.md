# Tasks

## 1. Firebase project (done by the owner in the Firebase/Google Cloud console)

- [x] 1.1 Owner creates the Firebase project on the Blaze plan and verifies billing is active in the console
- [x] 1.2 Owner creates Firestore (Standard edition, `europe-west6`) and the default Storage bucket (`europe-west6`), and verifies both locations in the console
- [x] 1.3 Owner enables Firebase Auth with Google as the only provider, signs in once, and records the owner UID for the rules; verify the UID appears under Auth > Users
- [x] 1.4 Owner creates budget alerts (for example $5 / $20 / $50) and verifies they are listed under Billing > Budgets & alerts

## 2. Workspace scaffold

- [x] 2.1 Create the Nx workspace with npm at the repo root and verify `npx nx report` runs
- [x] 2.2 Generate `apps/public` (Angular, SSR enabled, application builder) and verify `npx nx build public` produces a server bundle
- [x] 2.3 Generate `apps/admin` (Angular, no SSR) and verify `npx nx build admin` succeeds
- [x] 2.4 Generate `apps/functions` (Node, TypeScript) targeting `europe-west6` and verify `npx nx build functions` succeeds
- [x] 2.5 Generate `libs/models` and verify it can be imported from all three apps by building them
- [x] 2.6 Add the `firebase` Nx project owning `firebase.json`, `firestore.rules`, `storage.rules` and `firestore.indexes.json` as inputs, and verify `npx nx show project firebase` lists those inputs
- [x] 2.7 Tag projects (`backend`: firebase, functions; `frontend`: admin, public) and verify `npx nx show projects --projects tag:backend` returns exactly firebase and functions
- [x] 2.8 Configure the Emulator Suite (Auth, Firestore, Storage, Functions) with a `serve`/`emulators` Nx target and verify all four start locally
- [x] 2.9 Document local setup (install, emulators, running each app) in README.md and verify the documented commands run as written

## 3. Spikes (real project, before building features)

- [x] 3.1 S4: deploy the scaffolded `apps/public` to App Hosting (`europe-west4`, root directory `apps/public`) and verify the SSR page loads on its `*.hosted.app` address; if it fails, pin Angular/Nx to the newest App Hosting-supported versions and record the outcome in design.md
- [x] 3.2 S1: upload a test file, create a download-token URL with the Admin SDK, deploy Storage rules denying all reads, and verify the token URL still serves the file while a tokenless request is denied; record the result in design.md
- [x] 3.3 S2: request a token URL from at least two distant locations (or a CDN checker) and inspect response headers to determine whether downloads are edge-cached; record the result and whether the fallback (serving through the App Hosting CDN) is needed in design.md
- [x] 3.4 S3: set up Workload Identity Federation and a deploy service account, run a minimal GitHub workflow that runs `firebase deploy --only firestore:rules`, and verify it succeeds with no stored key; record the outcome in design.md
- [x] 3.5 S5: strip metadata from real artist files (JPEG, PNG, GIF, APNG) without re-encoding and verify pixel equality against the originals, color profile kept and GPS/camera data gone; record the chosen approach in design.md

## 4. Delivery pipeline

- [ ] 4.1 Add `deploy` targets: firebase (rules and indexes), functions, admin (`firebase deploy --only hosting`), public (`firebase apphosting:rollouts:create --git-commit`); verify each one runs locally against the real project, including the functions deploy while `apps/functions` exports no functions yet
- [ ] 4.2 Write the GitHub workflow: nx-set-shas, `nx affected -t lint test build` gate, stage 1 `tag:backend` deploy, stage 2 `tag:frontend` deploy, a concurrency group, keyless auth; verify that a push touching only `apps/admin` deploys only the admin
- [ ] 4.3 Turn off App Hosting automatic rollouts and add Artifact Registry cleanup policies (App Hosting builds, and functions images in `europe-west6` via `firebase functions:artifacts:setpolicy`); verify the settings in the console
- [ ] 4.4 Document the pipeline (what deploys when, and how to roll back) in README.md and verify a rollback to an earlier commit works for the public site

## Workflow follow-up

- Archive this change once section 4 is done, before archiving any feature change.
- Feature work continues in `add-image-upload`, `add-public-gallery`, `add-nsfw-handling` and `add-artists`, in that order.

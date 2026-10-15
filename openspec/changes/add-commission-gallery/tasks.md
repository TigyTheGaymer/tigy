# Tasks

UI scope: admin and public screens in sections 6-12 use minimal, unstyled markup, just enough to meet the specs and their tests. Layout, look and browsing controls are deferred to the separate UI/UX change (see Workflow follow-up). Paged lists (gallery, artist page) use a plain "next page" link as a placeholder until then.

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

- [ ] 3.1 S4: deploy the scaffolded `apps/public` to App Hosting (`europe-west4`, root directory `apps/public`) and verify the SSR page loads on its `*.hosted.app` address; if it fails, pin Angular/Nx to the newest App Hosting-supported versions and record the outcome in design.md
- [ ] 3.2 S1: upload a test file, create a download-token URL with the Admin SDK, deploy Storage rules denying all reads, and verify the token URL still serves the file while a tokenless request is denied; record the result in design.md
- [ ] 3.3 S2: request a token URL from at least two distant locations (or a CDN checker) and inspect response headers to determine whether downloads are edge-cached; record the result and whether the fallback (serving through the App Hosting CDN) is needed in design.md
- [ ] 3.4 S3: set up Workload Identity Federation and a deploy service account, run a minimal GitHub workflow that runs `firebase deploy --only firestore:rules`, and verify it succeeds with no stored key; record the outcome in design.md
- [ ] 3.5 S5: strip metadata from real artist files (JPEG, PNG, GIF, APNG) without re-encoding and verify pixel equality against the originals, color profile kept and GPS/camera data gone; record the chosen approach in design.md

## 4. Delivery pipeline

- [ ] 4.1 Add `deploy` targets: firebase (rules and indexes), functions, admin (`firebase deploy --only hosting`), public (`firebase apphosting:rollouts:create --git-commit`); verify each one runs locally against the real project, including the functions deploy while `apps/functions` exports no functions yet
- [ ] 4.2 Write the GitHub workflow: nx-set-shas, `nx affected -t lint test build` gate, stage 1 `tag:backend` deploy, stage 2 `tag:frontend` deploy, a concurrency group, keyless auth; verify that a push touching only `apps/admin` deploys only the admin
- [ ] 4.3 Turn off App Hosting automatic rollouts and add the Artifact Registry cleanup policy; verify both settings in the console
- [ ] 4.4 Document the pipeline (what deploys when, and how to roll back) in README.md and verify a rollback to an earlier commit works for the public site

## 5. Shared models

- [ ] 5.1 Define `Image`, `Artist`, `ArtistLink`, the processing status, and the file set types in `libs/models`, and verify all three apps compile against them
- [ ] 5.2 Add the `sortDate` helper (`date ?? createdAt`) and the download-filename helper (slug from artist, title and date), and verify their unit tests cover missing fields and special characters

## 6. Owner sign-in

- [ ] 6.1 Write the base Firestore rules: owner-only writes to images and artists by UID, everything else denied for now; verify with emulator rules tests that a signed-out client and another account cannot write
- [ ] 6.2 Add Google sign-in to the admin with an owner-only guard and `noindex`; verify with tests that another account is refused and with a response check that the noindex header/meta is present

## 7. Upload and processing

- [ ] 7.1 Write Storage rules: no public reads, owner uploads only to `uploads/{id}/` with image content types and at most 20 MB, no client writes under `images/`; verify with emulator rules tests
- [ ] 7.2 Add Firestore rules that block clients from writing processing fields (status, error, files, width, height, animated, masterName); verify with rules tests
- [ ] 7.3 Implement the upload trigger on `uploads/**` that sets status processing and rejects unsupported types; verify with an emulator test that a PDF leads to status error
- [ ] 7.4 Produce the master in the source format with metadata removed (using the S5 approach), color profile kept, and a readable download filename; verify with fixture tests for JPEG and PNG that pixels match and GPS data is gone
- [ ] 7.5 Produce `full.webp` (at most 1200px) and `thumb.webp` (at most 400px) with no upscaling; verify with fixture tests for large and small images
- [ ] 7.6 Handle animated GIF/APNG/WebP (animated web versions, `animated` flag) and produce `preview.jpg` from the first frame or still image; verify with an animated GIF fixture that frame count and timing are kept
- [ ] 7.7 Add the size guard (width × height × frames) and error handling (status error with reason, no auto-retry, upload kept); verify with an oversized fixture
- [ ] 7.8 Write token URLs, dimensions and status ready to the image doc, set immutable Cache-Control on outputs, then delete the upload; verify with an emulator test that the doc is complete and `uploads/{id}/` is empty
- [ ] 7.9 Set the upload function's options (`europe-west6`, 2 GiB, 300 s, concurrency 1, max 3 instances, retries off) and document upload processing in apps/functions/README.md; verify the deployed configuration in the console
- [ ] 7.10 Build image creation in the admin: create the ID first, write the draft doc, upload to `uploads/{id}/`; verify end to end on the emulators that a new entry reaches status ready
- [ ] 7.11 Build the admin image list (drafts and published, including NSFW) with live processing status and error reasons; verify against the emulator that a status change appears without reload
- [ ] 7.12 Make replacing an upload regenerate all outputs with new token URLs, and offer replace-file in the admin for images in error; verify with an emulator test that the URLs change
- [ ] 7.13 Document adding an image and retrying failed processing in apps/admin/README.md and verify the steps match the running app

## 8. Edit, publish, delete

- [ ] 8.1 Add the Firestore rule that blocks publishing unless status is ready; verify with rules tests
- [ ] 8.2 Build image editing (all fields except artist, set autocomplete from existing set names, `sortDate` on save); verify with component tests and an emulator round trip
- [ ] 8.3 Build publish/unpublish (disabled unless ready); verify on the emulators
- [ ] 8.4 Implement cleanup on image-doc delete (all files under `images/{id}/` and `uploads/{id}/`) and add it to apps/functions/README.md; verify with an emulator test
- [ ] 8.5 Build delete with confirmation in the admin; verify on the emulators that the doc and its files are removed
- [ ] 8.6 Document editing, publishing and deleting in apps/admin/README.md and verify the steps match the running app

## 9. Public browsing

- [ ] 9.1 Add Firestore rules for public reads: published images only, list queries limited to 24; verify with rules tests that drafts are unreadable and a query with limit 25 is refused
- [ ] 9.2 Define the composite index (`published`, `nsfw`, `sortDate`, id) for the SFW gallery; verify the paging query runs without index errors against the emulator
- [ ] 9.3 Set up public data access as an anonymous client with the server-to-browser handoff of the first page's data; verify that the browser does not re-fetch page 1 after hydration
- [ ] 9.4 Build the gallery with 24-per-page cursor paging in catalog order, a plain "next page" link as the placeholder paging control, and SFW images only; verify with tests that no image is skipped or repeated across pages
- [ ] 9.5 Build the image page (`/i/{id}`) with details, other SFW versions in the same set, the master download, and not-found for drafts and unknown IDs; verify with tests for each spec scenario
- [ ] 9.6 Set `Cache-Control` on SSR responses within the 5-minute freshness budget; verify the header on the deployed site
- [ ] 9.7 Add `apphosting.yaml` and document the public app's configuration in apps/public/README.md; verify an App Hosting rollout of the commit succeeds

## 10. NSFW

- [ ] 10.1 Define the composite index (`published`, `sortDate`, id) for lists that include NSFW; verify the paging query runs without index errors against the emulator
- [ ] 10.2 Build the "show NSFW" switch remembered in the browser and applied after hydration; verify that server HTML never contains NSFW images and that the switch persists across reloads
- [ ] 10.3 Build the NSFW confirm screen (server-rendered, skipped when the switch is on) and `noindex` on NSFW pages; verify with server-HTML tests
- [ ] 10.4 Make the other versions in the same set follow the switch; verify with tests for both spec scenarios

## 11. Artists

- [ ] 11.1 Add the Firestore rule that makes artists publicly readable; verify with rules tests
- [ ] 11.2 Build artist management in the admin (create, edit, delete, add/edit/reorder/remove links); verify on the emulators
- [ ] 11.3 Add the artist picker to image editing, writing `artistId` plus the artist copy; verify with a component test and an emulator round trip
- [ ] 11.4 Implement the artist fan-out on artist update (BulkWriter over `images where artistId == id`, drafts included) and add it to apps/functions/README.md; verify with emulator tests that renaming an artist updates all their images and deleting one leaves them unchanged
- [ ] 11.5 Flag images whose artist no longer exists in the admin; verify on the emulators
- [ ] 11.6 Show the artist credit with links on the image page; verify with tests for an image with an artist and one without
- [ ] 11.7 Define the artist-page composite indexes (with and without the nsfw filter), each with the document-ID tiebreaker; verify the paging queries run without index errors against the emulator
- [ ] 11.8 Build the artist page (`/artists/{id}`) with links, paged images following the switch, and not-found for deleted artists; verify with tests
- [ ] 11.9 Document artist management in apps/admin/README.md and verify the steps match the running app

## 12. Sharing

- [ ] 12.1 Add link-preview metadata (preview.jpg, title, artist) for SFW images only, and no image metadata for NSFW; verify by inspecting the server HTML of both kinds

## 13. Launch checks (production)

- [ ] 13.1 Upload a still and an animated image, publish them, and verify they appear on the public gallery within 5 minutes with working downloads
- [ ] 13.2 Share an SFW and an NSFW image link on at least two platforms (for example Discord and Bluesky) and verify the previews match the spec
- [ ] 13.3 Verify from a signed-out browser that a draft's `/i/{id}` shows not found and that direct storage requests are denied
- [ ] 13.4 Update PRODUCT.md with the product's purpose, users and capabilities, and verify it no longer says the purpose is undecided

## Workflow follow-up

- A separate UI/UX change covers layout and look for both apps, browsing controls (including replacing the placeholder next-page link), footer notice and cookie banner.
- Archive this change after implementation and review.

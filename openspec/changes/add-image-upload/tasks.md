# Tasks

Build order: this change builds on the archived `define-data-model` and comes before `add-admin-editing`. Run tasks through Nx (`npx nx ...`). Functions and rules tests run against the emulators, as they already do; the admin has unit tests and a check by hand in the emulators (design U9).

## 1. Model and rules

- [ ] 1.1 Add `Upload`, `UploadStatus`, `UploadError`, `UPLOADS_COLLECTION` and `uploadPaths.source(id)` to `libs/models` (design U2); verify with `npx nx run-many -t typecheck lint -p models functions admin`
- [ ] 1.2 Generate `libs/uploads` (tag `shared`) like the other libraries, with `detectImageFormat(bytes)`, the format table (format → extension and MIME type) and `MAX_UPLOAD_BYTES` (design U8); verify with unit tests for each format's signature, a too-short or unknown file and a PNG renamed `.jpg`, passing with `npx nx run-many -t lint test typecheck -p uploads`
- [ ] 1.3 Change the Storage rules: owner-only `create` of `uploads/{id}/source` up to 50 MB with an allowed content type, no browser reads, updates or deletes there, and no browser writes under `images/` (design U6); verify with rules tests in `firebase/tests` for the owner's upload, an oversized file, a wrong content type, a stranger's upload, reading an upload, and the owner writing under `images/`, all passing with `npx nx test firebase`
- [ ] 1.4 Change the Firestore rules: the owner may delete `uploads/{id}`, and nobody may create or update it from a browser (design U6); verify with rules tests for the owner's delete and the owner's create and update being refused
- [ ] 1.5 Add `firebase/storage-lifecycle.json`, deleting objects under `uploads/` one day after they were created (design U6); verify that it has one `Delete` rule with `age: 1` and `matchesPrefix: ["uploads/"]` and nothing else

## 2. Owner sign-in

- [ ] 2.1 Add the `OWNER_EMAIL` parameter and `beforeUserCreated` with the decision as a pure function that sets `owner: true` (design U7); verify with unit tests for the owner's email in other case, another email, an unverified email and another provider
- [ ] 2.2 Add `apps/functions/.env.demo-tigy` with the placeholder email and copy it into `dist/apps/functions` in the build; make `functions:deploy` write `.env.tigy-165cc` from `OWNER_EMAIL` and stop when it is unset; pass `vars.OWNER_EMAIL` in the deploy workflow; document the variable, Identity Platform and the hand deploy in the README (design U7, Migration Plan); verify that `npx nx build functions` puts the file in `dist`, and that the deploy target stops with a clear message when the variable is unset

## 3. Metadata stripper

- [ ] 3.1 Port `tmp/spikes/s5/strip.js` to `apps/functions/src/uploads/strip-metadata.ts` with the per-format rules from design U4 and a `damaged` error for files it cannot walk; add `upng-js` as a dev dependency; verify with unit tests on fixtures generated in the test (design U9): pixels and frames identical, ICC profile byte-identical, no EXIF, XMP or IPTC apart from the orientation, stripping twice changing nothing, and a cut-off file failing as damaged, so the scenarios "Photo with location data", "Animated GIF" and "Rotated photo" are covered

## 4. Processing

- [ ] 4.1 Add `sharp` to the functions build as an external dependency listed in the generated `package.json`; verify that `npx nx build functions` writes it into `dist/apps/functions/package.json` and the bundle doesn't contain it
- [ ] 4.2 Add the web versions and file details as a function from the stripped original to `full.webp`, `thumb.webp` and `ImageFile` (design U5); verify with unit tests for the scenarios "Tall comic", "Small sticker", "Animated portrait", "Animated PNG", "Opaque PNG with an alpha channel" and "Sideways photo"
- [ ] 4.3 Add `processUpload` (`onObjectFinalized`, 4 GiB, 2 CPUs, 540 s, concurrency 1, max 2 instances, retries on) with sharp loaded inside the handler after the path check, the steps, the format check through `libs/uploads`, the pixel limit, a download token on each saved file, the error codes and the cleanup on failure from design U3; export it from `main.ts`; verify with emulator tests calling the handler for a sticker (an unpublished image with `sortDate` of the day, its three files each with a download token, the record ready, the source gone), a wrong extension, an unsupported file, a damaged file, an oversized header, a path outside `uploads/`, a repeated event and a source that no longer exists, and with a test that loading `main.ts` does not load sharp
- [ ] 4.4 Add the trigger on deleting `uploads/{id}` that removes `uploads/{id}/` and, when no `images/{id}` exists, everything under `images/{id}/` (design U2); verify with emulator tests for a cleared failed upload with stray files and a cleared ready upload whose files stay, covering "Clearing a ready upload" and the cleanup in "Processing never finishes"

## 5. Admin foundations

- [ ] 5.1 Install `tailwindcss`, `@tailwindcss/postcss` and `postcss`, add `apps/admin/.postcssrc.json` and import Tailwind in the admin's stylesheet (design U8); verify that `npx nx build admin` applies a Tailwind class and that `npx nx build public` produces the same stylesheet as before
- [ ] 5.2 Install `@spartan-ng/brain` and `@spartan-ng/cli` with their peers `@angular/cdk`, `clsx` and `tw-animate-css`, run `@spartan-ng/cli:init`, set `components.json` to `libs/admin-ui` as entry points, add the components listed in design U8, add `@source` for the library and set the Tigy orange `--primary` with the light or dark theme following the device; verify with `npx nx run-many -t lint test build -p admin admin-ui`
- [ ] 5.3 Add the Firebase client in `app/firebase/` with the production configuration and a development replacement that connects Auth, Firestore and Storage to the emulators (design U8); verify with `npx nx serve admin` against `npx nx run firebase:emulators` showing the emulator connection in the console and no errors

## 6. Admin sign-in and shell

- [ ] 6.1 Add `AuthService` (user and `isOwner` as signals, Google popup sign-in, sign out) and `ownerGuard` as a `canMatch` guard with `next` (design U7); verify with unit tests for a signed-out visitor, the owner, a signed-in account without the claim, and `next` accepting only admin paths
- [ ] 6.2 Add the sign-in page (Google button, the "Only the owner can sign in." message for a refused account, nothing when the popup is closed) and the routes: `/sign-in`, `/uploads` lazy behind the guard, everything else to `/uploads`; verify with component tests and by hand in the emulators for "Owner signs in", "Stranger signs in", "Signed-out link to the Uploads page" and "Unknown admin address"
- [ ] 6.3 Add the top bar with the account menu and sign out; verify with a component test and by hand for "Signing out" and "Coming back later" (`admin-access`)

## 7. Uploads page

- [ ] 7.1 Add the drop zone and file picker with the checks before any upload: the format from the file's first 12 bytes through `detectImageFormat`, ignoring the name and `file.type`, and the size against `MAX_UPLOAD_BYTES` (design U8); verify with unit tests for "Unsupported format", "Too large" and a PNG named `.jpg`
- [ ] 7.2 Add `UploadService`: a new auto-ID per file, resumable upload to `uploads/{id}/source` with the file name in custom metadata and the detected format's content type, up to three at a time, progress per file in a signal, and a `beforeunload` warning while any file is uploading (design U1, U8); verify with unit tests against a faked Storage for progress, the content type, the three-at-a-time limit, a failed upload and the warning being on only while files upload
- [ ] 7.3 Add `UploadsService.list()` as a live `resource` of the newest 100 records, merged with the in-memory rows by ID, with the "took too long" status after 10 minutes (design U2, U8); verify with unit tests for the merge, a row waiting for its record, and the time limit
- [ ] 7.4 Add the upload list: name, status badge, progress, the thumbnail from `getDownloadURL`, dimensions and size when ready, the reason when failed, an empty state, and clearing for ready, failed and too-long rows with a confirmation; verify with component tests for each status, and by hand in the emulators for "Dropping three files", "From upload to ready" and "Coming back later" (`image-upload`)

## 8. Release

- [ ] 8.1 Check the whole flow in the emulators with the five pieces in `design/mockups/assets/`, plus a damaged file and an oversized one; verify that each becomes an unpublished image whose files the public site serves after it is published in the Emulator UI; record the result here
- [ ] 8.2 Do the owner's console steps, the hand deploys and the one-time lifecycle rule from the Migration Plan; grant `github-deploy` what the CI deploy of the blocking function asks for and add it to the README's role table; document the lifecycle step in the README; verify that a push deploys the functions and the admin through CI
- [ ] 8.3 Check in the real project: the owner signs in on `https://tigy-165cc.web.app`, another Google account is refused with no account created, the five real pieces upload and process with their thumbnails showing in the admin, a downloaded original has no metadata, `gcloud storage buckets describe gs://tigy-165cc.appspot.com` shows the lifecycle rule, and each artwork appears on the public site after being published in the console; record the result here

## Workflow follow-up

- Archive the change once the live checks are recorded, then propose `add-admin-editing`, with end-to-end tests of the admin against the emulators among its tasks.

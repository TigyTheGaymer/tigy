# Tasks

UI scope: admin and public screens use minimal, unstyled markup, just enough to meet the specs and their tests. Layout, look and browsing controls are deferred to the separate UI/UX change. Paged lists use a plain "next page" link as a placeholder until then.

## 1. Edit, publish, delete

- [ ] 1.1 Add the `sortDate` helper (`date ?? createdAt`) to `libs/models`, and verify its unit tests cover a missing date
- [ ] 1.2 Add the Firestore rule that blocks publishing unless status is ready; verify with rules tests
- [ ] 1.3 Build image editing (all fields except artist, set autocomplete from existing set names, `sortDate` on save); verify with component tests and an emulator round trip
- [ ] 1.4 Build publish/unpublish (disabled unless ready) and show each image's draft/published state in the admin list; verify on the emulators
- [ ] 1.5 Implement cleanup on image-doc delete (all files under `images/{id}/` and `uploads/{id}/`) and add it to apps/functions/README.md; verify with an emulator test
- [ ] 1.6 Build delete with confirmation in the admin; verify on the emulators that the doc and its files are removed
- [ ] 1.7 Document editing, publishing and deleting in apps/admin/README.md and verify the steps match the running app

## 2. Public browsing

- [ ] 2.1 Add Firestore rules for public reads: published images only, list queries limited to 24; verify with rules tests that drafts are unreadable and a query with limit 25 is refused
- [ ] 2.2 Define the composite index (`published`, `nsfw`, `sortDate`, id) for the SFW gallery; verify the paging query runs without index errors against the emulator
- [ ] 2.3 Set up public data access as an anonymous client with the server-to-browser handoff of the first page's data; verify that the browser does not re-fetch page 1 after hydration
- [ ] 2.4 Build the image route `/img/{id}/{v}/{name}` for `thumb.webp`, `full.webp` and `preview.jpg` (anonymous doc read, file streamed from the token URL, long-lived cache headers, not-found for drafts and unknown IDs) and use it for every web image on public pages; verify with tests for each spec scenario and, on the deployed site, that a repeat request from a distant region is served from the CDN (`Age` header)
- [ ] 2.5 Build the gallery with 24-per-page cursor paging in catalog order, a plain "next page" link as the placeholder paging control, and SFW images only; verify with tests that no image is skipped or repeated across pages
- [ ] 2.6 Build the image page (`/i/{id}`) with details, other SFW versions in the same set, the master download, and not-found for drafts and unknown IDs; verify with tests for each spec scenario
- [ ] 2.7 Set `Cache-Control` on SSR responses within the 5-minute freshness budget; verify the header on the deployed site
- [ ] 2.8 Add `apphosting.yaml` and document the public app's configuration in apps/public/README.md; verify an App Hosting rollout of the commit succeeds

## 3. Sharing

- [ ] 3.1 Add link-preview metadata (preview.jpg through the image route, title, artist) for SFW images only, and no image metadata for NSFW; verify by inspecting the server HTML of both kinds

## Workflow follow-up

- Archive this change after implementation and review, after `add-image-upload` and before `add-nsfw-handling`.

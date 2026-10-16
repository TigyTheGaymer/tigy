# Tasks

UI scope: admin and public screens use minimal, unstyled markup, just enough to meet the specs and their tests. Layout, look and browsing controls are deferred to the separate UI/UX change. The artist page uses a plain "next page" link as a placeholder until then.

## 1. Artists

- [ ] 1.1 Add the `Artist` type to `libs/models` and the Firestore rule that makes artists publicly readable; verify with rules tests
- [ ] 1.2 Build artist management in the admin (create, edit, delete, add/edit/reorder/remove links); verify on the emulators
- [ ] 1.3 Add the artist picker to image editing, writing `artistId` plus the artist copy; verify with a component test and an emulator round trip
- [ ] 1.4 Implement the artist fan-out on artist update (BulkWriter over `images where artistId == id`, drafts included) and add it to apps/functions/README.md; verify with emulator tests that renaming an artist updates all their images and deleting one leaves them unchanged
- [ ] 1.5 Flag images whose artist no longer exists in the admin; verify on the emulators
- [ ] 1.6 Show the artist credit with links on the image page; verify with tests for an image with an artist and one without
- [ ] 1.7 Define the artist-page composite indexes (with and without the nsfw filter), each with the document-ID tiebreaker; verify the paging queries run without index errors against the emulator
- [ ] 1.8 Build the artist page (`/artists/{id}`) with links, paged images following the switch, and not-found for deleted artists; verify with tests
- [ ] 1.9 Document artist management in apps/admin/README.md and verify the steps match the running app

## 2. Launch checks (production)

- [ ] 2.1 Upload a still and an animated image, publish them, and verify they appear on the public gallery within 5 minutes with working downloads
- [ ] 2.2 Share an SFW and an NSFW image link on at least two platforms (for example Discord and Bluesky) and verify the previews match the spec
- [ ] 2.3 Verify from a signed-out browser that a draft's `/i/{id}` shows not found and that direct storage requests are denied
- [ ] 2.4 Update PRODUCT.md with the product's purpose, users and capabilities, and verify it no longer says the purpose is undecided

## Workflow follow-up

- A separate UI/UX change covers layout and look for both apps, browsing controls (including replacing the placeholder next-page link), footer notice and cookie banner.
- Archive this change after implementation and review, after `add-nsfw-handling`.

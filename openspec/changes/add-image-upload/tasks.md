# Tasks

UI scope: admin screens use minimal, unstyled markup, just enough to meet the specs and their tests. Layout and look are deferred to the separate UI/UX change.

## 1. Shared models

- [ ] 1.1 Define `Image`, the artist copy and `ArtistLink`, the processing status, and the file set types in `libs/models`, and verify all three apps compile against them
- [ ] 1.2 Add the download-filename helper (slug from artist, title and date), and verify its unit tests cover missing fields and special characters

## 2. Owner sign-in

- [ ] 2.1 Write the base Firestore rules: owner-only writes to images and artists by UID, everything else denied for now; verify with emulator rules tests that a signed-out client and another account cannot write
- [ ] 2.2 Add Google sign-in to the admin with an owner-only guard and `noindex`; verify with tests that another account is refused and with a response check that the noindex header/meta is present

## 3. Upload and processing

- [ ] 3.1 Write Storage rules: no public reads, owner uploads only to `uploads/{id}/` with image content types and at most 20 MB, no client writes under `images/`; verify with emulator rules tests
- [ ] 3.2 Add Firestore rules that block clients from writing processing fields (status, error, files, width, height, animated, masterName); verify with rules tests
- [ ] 3.3 Implement the upload trigger on `uploads/**` that sets status processing and rejects unsupported types; verify with an emulator test that a PDF leads to status error
- [ ] 3.4 Produce the master in the source format with metadata removed (the stripping rules in design.md, A13), color profile kept, and a readable download filename; verify with fixture tests for JPEG and PNG that pixels match and GPS data is gone
- [ ] 3.5 Produce `full.webp` (at most 1200px) and `thumb.webp` (at most 400px) with no upscaling; verify with fixture tests for large and small images
- [ ] 3.6 Handle animated GIF/APNG/WebP (animated web versions, `animated` flag) and produce `preview.jpg` from the first frame or still image; verify with an animated GIF fixture that frame count and timing are kept
- [ ] 3.7 Add the size guard (width × height × frames) and error handling (status error with reason, no auto-retry, upload kept); verify with an oversized fixture
- [ ] 3.8 Write token URLs, dimensions and status ready to the image doc, set immutable Cache-Control on outputs, then delete the upload; verify with an emulator test that the doc is complete and `uploads/{id}/` is empty
- [ ] 3.9 Set the upload function's options (`europe-west6`, 2 GiB, 300 s, concurrency 1, max 3 instances, retries off) and document upload processing in apps/functions/README.md; verify the deployed configuration in the console
- [ ] 3.10 Build image creation in the admin: create the ID first, write the entry (unpublished), upload to `uploads/{id}/`; verify end to end on the emulators that a new entry reaches status ready
- [ ] 3.11 Build the admin image list (all images, including NSFW) with live processing status and error reasons; verify against the emulator that a status change appears without reload
- [ ] 3.12 Make replacing an upload regenerate all outputs with new token URLs, and offer replace-file in the admin for images in error; verify with an emulator test that the URLs change
- [ ] 3.13 Document adding an image and retrying failed processing in apps/admin/README.md and verify the steps match the running app

## Workflow follow-up

- Archive this change after implementation and review, before archiving `add-public-gallery`.

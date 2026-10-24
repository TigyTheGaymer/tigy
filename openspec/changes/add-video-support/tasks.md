# Tasks

Build order: `add-admin-editing` is archived first, so the editor requirement this change modifies is in the main spec. Run tasks through Nx (`npx nx ...`). Functions and rules tests run against the emulators as they already do.

## 1. Formats, limits and models

- [x] 1.1 In `libs/uploads`, replace `detectImageFormat` with `detectFormat` covering `mp4`, `mov` and `webm` as in design D1 (the `ftyp` brand list, EBML with the `webm` DocType), add `isVideoFormat()`, grow `FORMAT_SIGNATURE_BYTES` to 64, add the three video entries to the format table, and split the limit into `MAX_IMAGE_BYTES` and `MAX_VIDEO_BYTES`; update the callers; verify with unit tests for each video signature, HEIC, AVIF and 3GP brands refused, Matroska that isn't WebM refused, a file shorter than 64 bytes, and the existing image cases unchanged, passing with `npx nx run-many -t lint test -p uploads admin functions`
- [x] 1.2 In `libs/models`, add `durationMs` and `hasAudio` to `ImageFile`, `durationMs` to `Upload.file`, `isVideo` to `GalleryRow`, `video` and `preview` to `imagePaths`, and the four new `UploadError` codes (design D5); have the summary builder in `libs/gallery` set `isVideo` from `file.mime`; verify with unit tests for a video and an image row, and `npx nx run-many -t lint test build -p models gallery`
- [x] 1.3 Change `storage.rules` for `uploads/{id}/source` to the two type-and-size pairs in design D1; verify with rules tests for a 120 MB MP4, MOV and WebM allowed, a 250 MB MP4 refused, a 60 MB PNG refused, a `video/x-matroska` refused and a stranger's video refused, passing with `npx nx test firebase`

## 2. Video processing

- [x] 2.1 Add pinned `ffmpeg-static` and `ffprobe-static` to the workspace, and `uploads/video/ffmpeg.ts` with `runFfmpeg`/`probe` wrappers that spawn the binaries with a timeout and turn a non-zero exit into an error with stderr attached (design D2); check that the pinned ffprobe reports the display matrix, otherwise probe through ffmpeg (design Open Questions); verify with a functions test that probes a generated clip, and that `npx nx build functions` writes both packages into `dist/apps/functions/package.json`
- [x] 2.2 Add video fixtures to `apps/functions/src/testing/` made with ffmpeg at test time: a 3 s MP4 with sound and location and model tags, a rotated MOV, a silent VP9 WebM, a 4-minute 64 × 64 clip, an 8K single-frame clip, a clip whose first frame is black, and a truncated MP4 (design D10); verify by probing each in a test
- [x] 2.3 Add the probe and limit checks of design D4 step 1, returning `unreadable`, `video-too-long` and `video-too-large`, with the displayed size swapping for 90° and 270° rotations; verify with tests for each fixture's code and for a portrait rotated clip just inside 3840 × 2160 passing
- [x] 2.4 Add the original's clean-up by remux (design D4 step 2); verify with tests that the MP4's location, model and encoder tags are gone, the `streamhash` of video and audio matches the source, the rotated MOV keeps its rotation, and subtitle and data tracks are dropped (covers "Phone video with location data", "Rotated video")
- [x] 2.5 Add the web copy and the preview (design D4 steps 3 and 4), with the stream-copy path when the original is already H.264 `yuv420p` with AAC or no sound and within 1920; verify with tests for "Portrait animation with sound", "Short loop", the VP9 WebM coming out as H.264 `yuv420p` with `faststart` ("Plays in Safari"), the stream-copy path keeping the original's streams, and the preview having no audio track
- [x] 2.6 Add the stills (design D4 step 5) through `makeWebVersions`, and the video's `ImageFile` (step 6); verify with tests for "Video stills" (the black-first-frame fixture yields a non-black still at 1920 × 1080 and 720 × 405), "Video with sound" and "Silent video"
- [x] 2.7 Branch `processUploadedObject` on the detected format into the image path or `processVideo`, working in a per-upload temp directory that is removed in a `finally`, saving `full.mp4` and `preview.mp4` besides the three existing files, refusing an image over 50 MB or a video over 200 MB with `file-too-large`, and raising the function to 4 CPUs after checking the allowed CPU and memory pairs in the current Firebase docs (design D3); verify with emulator tests that a video upload creates the artwork with five files and a ready record carrying the duration, that each failure code leaves no files and no artwork, that "Image sent as a video" fails with `file-too-large`, that the temp directory is gone after success and failure, and that the existing image tests still pass, with `npx nx test functions`
- [x] 2.8 Check that deleting a video artwork removes `full.mp4` and `preview.mp4` with the rest of its folder, and that `rebuildSummaries` writes `isVideo` for a video; verify with emulator tests in `sync-image.spec.ts` and `rebuild-summaries.spec.ts`

## 3. Public site

- [x] 3.1 Add byte ranges to `server/files.ts` and `storageFiles()`, and allow `full.mp4` and `preview.mp4` (design D6); verify with `files.spec.ts` tests for a 206 with `Content-Range`, an open-ended and a suffix range, a 416 past the end, a multi-range and a malformed header getting 200, `Accept-Ranges` on every file, `noindex` on an NSFW piece's video files, and the existing file tests unchanged (covers "Range request", "Range beyond the end", "NSFW video files")
- [x] 3.2 Add `videoUrl` and `previewUrl` to `shared/urls.ts` and `formatDuration` to `shared/format.ts`, and teach the format name about the video MIME types; verify with unit tests for "0:42", "2:05", "0:04" and each format name
- [x] 3.3 Add the `VideoPreview` tile component and the shared observer service of design D7, used by `tiles.html` for rows with `isVideo`; verify with component tests that the server render has only the still, that the preview loads and plays when observed and pauses when it leaves, that reduced motion and Save-Data load nothing, that a rejected `play()` leaves the still, and that the title label and NSFW badge still show (covers "Scrolling past a video", "Reduced motion", "Data saver", "Off-screen tiles")
- [x] 3.4 Render the video player on the artwork page for a video piece in place of the image and the full-view button, with play after hydration unless reduced motion is asked for, and pause and clear on leaving or changing pieces (design D8); verify with component tests for "Opening a video piece", "Reduced motion" (player paused), "Moving to the next piece", "Video full screen" (no full-view button), "NSFW video behind the confirm screen" (no `<video>` before confirming) and the image page unchanged
- [x] 3.5 Show the video details in the credits panel (design D8); verify with component tests for "Video details" and "Silent video"
- [x] 3.6 Add a small committed sample video to `firebase/seed` with its processed files, published, and add `public-e2e` specs for a playing video tile, its still under reduced motion, the artwork player starting muted and unmuting, seeking through a 206 response, the video download name, and an NSFW video behind the confirm screen; verify with `npx nx e2e public-e2e`

## 4. Admin

- [x] 4.1 Accept videos in `check-file.ts`, the drop zone and the Upload button's picker with the per-kind limits and messages, and add messages for the four new upload error codes (design D9); verify with unit tests for "Large video", "Video too large", "Unsupported format" with the new list, and each new error message
- [x] 4.2 Show a ready video's duration in its upload row and its Artworks tile details; verify with component tests for "A video becomes ready"
- [x] 4.3 Show the video player in the editor with its duration and sound among the file details, pausing and clearing it when moving to another artwork (design D9); verify with component tests for "Opening a video" and "Moving on from a playing video"
- [x] 4.4 Add an `admin-e2e` spec that uploads a generated MP4 on the Artworks page, waits for it to become ready, opens the editor, checks the player and the duration, and publishes it; verify with `npx nx e2e admin-e2e`

## 5. Integration

- [ ] 5.1 Deploy to the project and time the worst case: a 3-minute 4K 60 fps HEVC phone clip, checking it is ready under 6 minutes, and that the deployed ffmpeg has `libx264` (design Risks); if it is slower, apply the design's fallbacks and update this change's specs before release
- [ ] 5.2 Check a video piece by hand on Safari on an iPhone, Chrome on Android and a desktop browser: tile autoplay, the player with sound, seeking and full screen; record any fixes as tasks here

## Workflow follow-up

- Archive `add-admin-editing` before starting.
- Archive this change once the integration checks pass.

# Design

## Context

See proposal.md for why. The current pipeline:

- The admin reads a file's first 12 bytes with `detectImageFormat` (`libs/uploads`), refuses anything else or anything over `MAX_UPLOAD_BYTES`, and uploads it to `uploads/{id}/source`. `storage.rules` checks the owner, the size and `image/(jpeg|png|gif|webp)`.
- `processUpload` (`apps/functions/src/uploads/process-upload.ts`, 4 GiB, 2 CPUs, 540 s, concurrency 1) downloads the source into memory, strips metadata with hand-written per-format strippers, makes `full.webp` and `thumb.webp` with sharp, creates `images/{id}` and marks the upload ready. Failures delete what was written and record an `UploadError` code.
- The public server streams `/img/{id}/{thumb.webp|full.webp|original.ext}` from Storage through `server/files.ts`, sending the whole file every time. Tiles use `thumb.webp`, the artwork page `full.webp`, link previews `full.webp`.
- `GalleryRow` in `meta/gallery` carries what the gallery needs about each published piece, so tiles never read the artwork.
- The admin's editor and its `artwork-editing` requirements come from `add-admin-editing`, which is nearly done and must be archived before this change, because this change's `artwork-editing` delta modifies a requirement that change adds.

## Goals / Non-Goals

**Goals:**

- A video is an artwork like any other: same collection, IDs, credits, publishing, NSFW handling, deletion and summaries.
- Every piece, video or not, still has `thumb.webp` and `full.webp`, so link previews, the admin's lists, the NSFW blur and anything that only knows images keep working unchanged.
- The original keeps its streams bit for bit; only the container is rewritten.

**Non-Goals:**

- No new collection, no `kind` field to migrate: a piece is a video exactly when its `file.mime` starts with `video/`.
- No streaming formats (HLS/DASH), no per-device renditions: one web copy and one preview.
- No change to how images are processed.

## Decisions

### D1. Formats are detected from the container signature, in `libs/uploads`

`detectImageFormat` becomes `detectFormat`, returning one of `jpeg | png | gif | webp | mp4 | mov | webm`, with `isVideoFormat()` beside it. `FORMAT_SIGNATURE_BYTES` grows from 12 to 64.

- MP4 and MOV: `ftyp` at offset 4, then the major brand. `qt  ` is MOV; `isom`, `iso2`–`iso6`, `mp41`, `mp42`, `avc1`, `M4V `, `dash` and `mmp4` are MP4. Every other brand is refused, which keeps out HEIC (`heic`, `mif1`), AVIF and 3GP that share the `ftyp` box.
- WebM: the EBML magic `1A 45 DF A3` and the DocType `webm` within the first 64 bytes. Other Matroska files are refused.

`FORMATS` maps each to its extension and MIME type (`video/mp4`, `video/quicktime`, `video/webm`). `MAX_UPLOAD_BYTES` splits into `MAX_IMAGE_BYTES` (50 MB) and `MAX_VIDEO_BYTES` (200 MB); `storage.rules` repeats both, as it does today:

```
(request.resource.contentType.matches('image/(jpeg|png|gif|webp)') && request.resource.size <= 50 * 1024 * 1024)
|| (request.resource.contentType.matches('video/(mp4|quicktime|webm)') && request.resource.size <= 200 * 1024 * 1024)
```

Storage only sees the declared type, so processing checks the size again against the detected format (the "image sent as a video" scenario) and refuses with `file-too-large`.

*Alternative:* trusting ffprobe's format name. Rejected: the admin has to refuse before uploading, in the browser, without ffprobe.

### D2. ffmpeg and ffprobe ship with the functions as npm binaries

`ffmpeg-static` and `ffprobe-static` become dependencies of the functions. The esbuild build keeps third-party packages external (`thirdParty: false`, `generatePackageJson: true`), so the deploy's `npm install` fetches the Linux binaries, and local tests get the Windows or macOS ones. A small `apps/functions/src/uploads/video/ffmpeg.ts` wraps `child_process.spawn` with a timeout, collects stderr for the log and turns a non-zero exit into an error. Like `loadSharp`, nothing loads until a video arrives.

*Alternatives:* the runtime image's own ffmpeg (Cloud Run functions' Node 24 image doesn't promise one); a separate Cloud Run job with a custom container (more infrastructure for a one-owner site); `ffmpeg.wasm` (several times slower, and memory-bound inside the function).

### D3. One trigger, branched by format, with more CPU

`processUploadedObject` stays the only entry point and keeps its idempotency, its record writes and its clean-up. After detecting the format it calls either the existing image path or a new `processVideo` in `uploads/video/`, both returning the same shape: the files to save and the `ImageFile` to record. The function goes from 2 to 4 CPUs (memory stays 4 GiB) because x264 uses every core. Images cost the same per run either way, since they finish in seconds.

Videos are written to a per-upload directory under `os.tmpdir()` rather than held in memory, because ffmpeg works on files and a 200 MB source would otherwise be held several times over. `/tmp` counts against memory: at most source + original + web copy + preview, under 700 MB, well inside 4 GiB. The directory is removed in a `finally`.

*Alternative:* a second `onObjectFinalized` function only for videos, with its own resources. Rejected for now: both would fire for every upload and each would have to read the bytes to know whether it is theirs, and the extra CPU doesn't cost images anything that matters.

### D4. Steps for a video

1. **Probe** with `ffprobe -show_format -show_streams -of json`. A failure, no video stream, or a video codec ffmpeg cannot decode is `unreadable`. Duration over 180 s is `video-too-long`; a displayed size over 3840 × 2160 in either orientation is `video-too-large`. The displayed size swaps width and height when the display matrix rotates by 90° or 270°.
2. **Clean the original** by remuxing, never re-encoding:
   `ffmpeg -i source -map 0:V:0 -map 0:a:0? -c copy -map_metadata -1 -map_metadata:s:v -1 -map_metadata:s:a -1 -map_chapters -1 -fflags +bitexact -flags:v +bitexact -flags:a +bitexact [-movflags +faststart] original.ext`.
   `0:V` (capital) skips cover art; dropping the other streams removes subtitle tracks and timed metadata tracks such as a phone's location track; `-map_metadata` removes global and per-stream tags, QuickTime `udta`/`mdta` keys included; `bitexact` stops ffmpeg writing its own encoder tag. The display matrix is stream side data, not a tag, so the rotation stays. The tests compare `-f streamhash` of source and original to prove the streams are untouched.
3. **Web copy** `full.mp4`: H.264 High, `yuv420p`, CRF 23, preset `veryfast`, longer side at most 1920 (never upscaled, even dimensions), frame rate capped at 60, AAC 128 kb/s stereo when there is sound, `+faststart` so playback can start before the end arrives. ffmpeg applies the rotation while scaling. When the cleaned original is already H.264 `yuv420p` with AAC or no sound, in MP4 or MOV, and no larger than 1920, the web copy is the cleaned original remuxed to MP4 instead: faster, lossless, and never larger than the original.
4. **Preview** `preview.mp4`: the first 10 seconds, no audio, longer side at most 720, CRF 30, H.264 `yuv420p`, `+faststart`. A tile is at most a few hundred CSS pixels wide, and this keeps a preview to a few hundred kilobytes.
5. **Stills**: `ffmpeg -t 1 -i source -vf thumbnail -frames:v 1 frame.png` picks the most representative frame of the first second, which skips a black opening frame. The PNG goes through the existing `makeWebVersions` to make `full.webp` and `thumb.webp`, so stills look like every other piece's.
6. **Record**: `ImageFile` with the cleaned original's format, bytes, displayed `w`/`h`, `animated: true`, `transparent: false`, `durationMs` and `hasAudio`.

H.264 is used for both outputs because it plays in every current browser, Safari on iOS included, and decodes in hardware on phones. VP9 or AV1 would be smaller but not universal, and offering two sources doubles processing time.

### D5. Data model

- `ImageFile` gains `durationMs?: number` and `hasAudio?: boolean`, both set only for a video. `Upload.file` adds `durationMs` to its `Pick`.
- `GalleryRow` gains `isVideo?: true`, set only for videos so image rows don't grow. The summary builder in `libs/gallery` derives it from `file.mime`, so `sync-image` and `rebuild-summaries` need no logic of their own. Existing rows rebuild as they are.
- `imagePaths` gains `video` (`full.mp4`) and `preview` (`preview.mp4`). Deleting an artwork already deletes its whole folder.
- `UploadError` gains `video-too-long`, `video-too-large`, `file-too-large` and `unreadable`. The admin turns each into words, as it does today.

Firestore rules need no change: `file` is not an editable field, and artworks come only from processing.

### D6. Serving: byte ranges in `server/files.ts`

The router allows `full.mp4` and `preview.mp4` besides today's names, with the same `noindex` and caching. `StoredFile.read` takes an optional `{ start, end }`, which `storageFiles()` passes to `createReadStream`. `send()` sends `Accept-Ranges: bytes`, and for a single `bytes=a-b`, `bytes=a-` or `bytes=-n` answers 206 with `Content-Range`, or 416 with `Content-Range: bytes */size` when the range starts past the end. A multi-range or malformed header gets the whole file with 200, which HTTP allows. Safari won't play a video without 206 responses, and seeking a 40 MB web copy shouldn't download all of it.

The CDN in front of App Hosting serves ranges from a cached full response, so ranges add no Storage reads once a file is cached.

### D7. Gallery tiles: a still that a video replaces on the client

The server-rendered tile is unchanged: the `<img>` of `thumb.webp` at the piece's shape, so the first paint, crawlers and visitors without JavaScript get a still. For a row with `isVideo`, the tile adds, in the browser only, a `<video muted loop playsinline preload="none">` stacked over the image with the same size, its `src` set to `preview.mp4` only when an `IntersectionObserver` (one shared by the grid, `rootMargin` of about half a screen) says it is near. It plays when visible and pauses when it leaves; the `<img>` stays underneath, so a failed or blocked `play()` (iOS Low Power Mode, autoplay policies) leaves the still. The video fades in on its `playing` event, so nothing jumps.

Nothing loads or plays when `matchMedia('(prefers-reduced-motion: reduce)')` matches or `navigator.connection?.saveData` is true. Both are read once and followed with listeners on the media query.

This lives in a `VideoPreview` component in `home/tiles/`, with the observer in a small service, so `tiles.html` keeps one `@if (tile.isVideo)`.

*Alternative:* swapping `thumb.webp` for an animated WebP made from the video, which would need no client code. Rejected: an animated WebP of 10 seconds at 720 pixels is many times larger than the H.264 preview, and it would animate for visitors who asked for reduced motion.

### D8. Artwork page: a native player

For a video, `artwork.html` renders `<video controls muted loop playsinline preload="metadata" poster="full.webp">` with the piece's width and height, in place of the `<img>` and the button that opens the full view. Native controls give play, seek, volume, mute and full screen with keyboard and screen-reader support on every platform, which a custom player would have to rebuild. The server never renders `autoplay`, since it can't know about reduced motion. After hydration, unless reduced motion is asked for, the component calls `play()` and ignores a rejection. When the artwork changes or the page is left, the component pauses the video and clears its `src`, so sound never carries over.

The NSFW confirm screen already keeps the piece out of the DOM until it is confirmed, so the video, its poster and its preview stay unloaded the same way the image does.

The credits panel reads the new fields: the format name becomes "MP4 video", "MOV video" or "WebM video", and the panel adds the duration (`formatDuration` in `shared/format.ts`: "0:42", "2:05") and "With sound" or "Silent". Link previews keep `og:image` = `full.webp` as the poster and add `og:video` (`full.mp4`, `video/mp4`, with its width and height) and `og:type` `video.other`, so embedders that play video play it. A GIF's preview links its original GIF instead of `full.webp`: embedders animate GIFs but show only the first frame of an animated WebP.

### D9. Admin

- `check-file.ts` uses `detectFormat` and the limit for the detected kind. The drop zone and the picker accept `image/*,video/mp4,video/quicktime,video/webm`. The upload itself already uses resumable uploads with progress, which suits 200 MB.
- Upload rows and artwork tiles keep using `thumb.webp`. A ready video row adds its duration to its details.
- The editor shows `<video controls muted loop playsinline>` of `full.mp4` with `full.webp` as its poster for a video, and the duration and sound beside the other file details. It pauses and clears the video when it moves to another artwork. No autoplay in the admin.

### D10. Tests and fixtures

- Unit tests in `libs/uploads` cover each signature, the brands that must be refused (HEIC, AVIF, 3GP), Matroska that isn't WebM and files shorter than 64 bytes.
- The functions' tests make their videos at test time with `ffmpeg-static` (`testsrc` and `sine` sources), as `testing/images.ts` makes images: a 3 s MP4 with sound and GPS and model tags, a rotated MOV, a silent VP9 WebM, a 4-minute 64 × 64 clip for the length limit, an 8K single-frame clip for the size limit, and a truncated file. They assert stream hashes, removed tags, kept rotation, sizes, durations and failure codes.
- `server/files.spec.ts` covers 206, open-ended and suffix ranges, 416 and the fallback to 200.
- Component tests cover the tile's three states (still, playing, reduced motion) with stubbed `IntersectionObserver` and `matchMedia`, and the player's pause on navigation.
- The seed gets one small committed sample video (a few seconds, under 300 KB) with its processed files, so the e2e suites can check a playing tile, the artwork player, range requests and the editor.

## Risks / Trade-offs

- **Worst-case processing time.** A 3-minute 4K 60 fps HEVC phone video takes 4K decoding plus a 1080p encode on 4 CPUs, which may approach the 540 s limit. → The tests include a timing measurement against the deployed function before release. If the worst case takes over 6 minutes, use preset `superfast`, and if that isn't enough, lower the limits with an update to this change before shipping, not after.
- **Binary packages fetched at deploy.** `ffmpeg-static` downloads its binary during `npm install`; a failed download fails the deploy. → The deploy fails loudly rather than shipping without ffmpeg; pin exact versions; the first task checks that the deployed binary has `libx264` and runs on the functions' Linux image.
- **Storage and egress grow.** Each video adds its original, a web copy and a preview, and autoplaying tiles cost egress on every gallery visit. → Previews are capped at 10 s and 720 px and load only near the screen; the Save-Data and reduced-motion paths load nothing; CDN caching applies as to images.
- **Remuxing changes the container bytes.** The original is not byte-identical to the upload, only stream-identical. → That is what "not re-encoded" means for images today too (strippers rewrite containers); the spec now says streams are kept exactly.
- **The display matrix after `-map_metadata -1`.** Older ffmpeg builds dropped the rotation along with the tags. → The rotated-MOV test catches it; the pinned ffmpeg is 6 or later, which keeps it as side data.
- **Old public site during deploy.** If the functions ship before the public site, a published video shows on the old site as its still `full.webp`, with a download of the video. → Acceptable for minutes; deploy order below keeps it short.
- **`isVideo` missing from rows built before the deploy.** Only videos need it, and no video exists before the deploy, so no backfill is needed.

## Migration Plan

1. Archive `add-admin-editing` so the `artwork-editing` requirement this change modifies is in the main spec.
2. Deploy the functions (ffmpeg, new processing, summary field), then Storage rules (video types and limit), then the public site and the admin together, as the existing deploy workflow does.
3. No data migration: images have no `durationMs`, `hasAudio` or `isVideo`, and every reader treats their absence as an image.
4. Rollback: redeploy the previous functions and rules. Any video pieces already made stay valid documents; unpublish them if the previous public site should not offer them, since it would show only their stills.

## Open Questions

- The exact versions of `ffmpeg-static` and `ffprobe-static` to pin, and whether `ffprobe-static`'s bundled ffprobe is new enough to report the display matrix; if not, probe with `ffmpeg -i` through the same ffmpeg binary. Either way the behaviour and tasks stay the same.
- Whether Cloud Run functions accept 4 CPUs with 4 GiB or need 8 GiB alongside. The task that raises the CPU checks this against the current Firebase docs.

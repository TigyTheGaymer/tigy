# Proposal

## Why

Much of Tigy's art is short animation, and today it can only go up as an animated GIF or WebP: large, without sound and often worse looking than the MP4 the artist delivered. The owner needs to upload the video itself and have the public site play it, in the gallery as a moving tile and on the artwork page with its sound.

## What Changes

- **Video uploads.** The admin and Storage accept MP4, MOV and WebM files of at most 200 MB and 3 minutes, alongside the image formats. Images keep their 50 MB limit. The format is still judged by the file's content.
- **Processing a video.** A video upload becomes an artwork like an image does. Processing removes the original's metadata (location, device, creation dates, comments, timed metadata tracks) by remuxing, without re-encoding its picture or sound, and keeps its rotation. It makes:
  - a web copy (H.264/AAC MP4, longer side at most 1920 pixels, sound kept), which is what the artwork page plays;
  - a short silent preview loop (at most the first 10 seconds, longer side at most 720 pixels) for the gallery tile;
  - the still thumbnail and full image as WebP from an early frame, so every piece still has `thumb.webp` and `full.webp` for posters, link previews and the admin.
- **File details for videos.** The artwork records duration and whether the video has sound, besides format, size and displayed dimensions. Videos count as animated and not transparent.
- **Limits and failures.** Processing refuses a video longer than 3 minutes or larger than 3840 × 2160, says why, and leaves nothing behind. A video is normally ready within 5 minutes.
- **Gallery tiles play.** A video's tile autoplays its muted preview loop while it is on screen and pauses when it leaves. Visitors who ask for reduced motion or data saving see the still thumbnail instead. Tiles keep the piece's shape like every other tile.
- **Artwork page plays.** A video piece shows a player with the web copy, muted at first, looping, with controls to play, pause, seek, unmute and go full screen. The zooming full view stays for images only. The credits panel shows the format, duration, size, dimensions and whether it has sound. The download link saves the cleaned original (`hey-pookie.mp4`).
- **Serving video.** `/img/{id}/` also serves `full.mp4` and `preview.mp4`, and every file there answers byte-range requests, so browsers (Safari above all) can seek and stream. Caching and `noindex` for NSFW pieces apply to video files as to images.
- **Admin.** Upload rows and the editor show a video's duration; the editor plays the video instead of showing the image. Nothing else about editing changes.
- **Summaries.** Gallery rows say whether a piece is a video, so the gallery can choose a tile without reading each artwork.

Out of scope: trimming, cropping or choosing the poster frame in the admin; captions and subtitles; HLS or adaptive streaming; videos longer than 3 minutes; transparent (alpha) video; turning an uploaded GIF into a video.

## Capabilities

### New Capabilities

None. Videos are artworks, so their behaviour belongs to the existing capabilities.

### Modified Capabilities

- `image-upload`: which files are accepted and their limits, what processing makes from a video, how metadata is removed from one, which file details it records, and the limits and readiness time for videos.
- `public-gallery`: video tiles that play a muted preview while visible, the video player on the artwork page in place of the zooming full view, and video details in the credits panel.
- `public-pages`: the artwork page shows a player for a video, the site serves the video files with byte ranges, and crawler rules cover them.
- `artwork-editing`: the editor plays a video piece and shows its duration and sound. This builds on `add-admin-editing`, which must be archived first.

## Impact

- `libs/uploads`: video signatures and limits beside `detectImageFormat`.
- `libs/models`: `ImageFile` gains `durationMs` and `hasAudio` for videos; `GalleryRow` gains `isVideo`; `imagePaths` gains the two video files. `Upload.file` carries the duration.
- `apps/functions`: `processUpload` branches for video, with ffmpeg and ffprobe bundled into the functions deploy; the function's CPU and memory may need raising. The image and summary triggers copy `isVideo` into gallery rows.
- `firebase/storage.rules`: video content types and the 200 MB limit for video.
- `apps/admin`: upload checks, drop zone and picker accept video; upload rows, artwork tiles and the editor show videos.
- `apps/public`: `server/files.ts` (new files, range requests), tiles, artwork page, credits panel and the tests around them.
- `firebase/seed` and the e2e suites gain a small sample video.
- Cost: video processing runs longer than image processing, and video files make Storage and egress grow faster.

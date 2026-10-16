# Design

## Context

See proposal.md for motivation and scope. The platform from `setup-gallery-platform` is in place: the Nx workspace, the Firebase project `tigy-165cc`, the emulators, and the workflow that deploys every push to `main`. The system overview and the platform decisions (A8, A10, A11, A12) are in that change's design.

This change lands the first data: image entries in Firestore, files in Storage, and the function that connects them. Nothing is public yet; the public site keeps showing the scaffold until `add-public-gallery`.

## Goals / Non-Goals

**Goals:**
- The image files the public will see are produced by one backend pipeline, never directly by the browser.
- Security rules are the single access gate: only the owner writes, and no stored file is reachable without its token URL.
- An upload can never be lost to a processing bug: it is deleted only after every output is written.

**Non-Goals:**
- Editing, publishing, deleting, and anything visitors see (`add-public-gallery`).
- Assigning artists (`add-artists`).
- Visual design of the admin (separate UI/UX change).

## Decisions

### Product decisions this change builds on

- **#2 Everything is per image, not per commission.** Each image is its own entry with its own artist, date, fields and NSFW flag.
- **#5 Every field is optional except the image file.**
- **#6 IDs are Firestore auto-IDs, created in the admin before upload** (`doc(collection(...)).id`). The same ID is used for the Firestore doc, the Storage path and the URL (`/i/{id}`), so links never change when fields are edited.
- **#7 Image fields:** image file, title, artist, date, set, NSFW flag, description. Character, type and price are not included yet.
- **Defaults:** web versions are 400px (grid) and 1200px (full view) WebP. Metadata is stripped. The upload limit is 20 MB. There is no watermark. Admin sign-in uses Google, and the rules check the owner's exact UID. The admin site is not indexed.
- **Override:** "originals kept private" no longer applies. Originals become public downloads (A13).

### Data model

```
images/{id}
  title?, description?, date?, set?, nsfw
  artistId?                       reference to artists/{id} (add-artists)
  artist?   { name, links[] }     copy of the artist record for display (add-artists, A6)
  published                       false until the owner publishes (add-public-gallery)
  sortDate                        date ?? createdAt (add-public-gallery, A5)
  createdAt, updatedAt
  status    processing|ready|error   written by functions only
  error?                             written by functions only
  animated, width, height            written by functions only
  files     { master, full, thumb, preview }   token URLs, functions only
  masterName                         download filename, functions only
```

The types in `libs/models` cover the whole document from the start, so later changes only add behaviour, not fields.

Storage layout:

```
uploads/{id}/<original name>     temporary, owner-only; deleted after processing
images/{id}/master.<ext>         lossless master, same format as uploaded
images/{id}/full.webp            1200px (no upscaling), animated if the source is
images/{id}/thumb.webp           400px, animated if the source is
images/{id}/preview.jpg          still image (first frame) for link previews
```

### A1 - Image processing is our own functions code using sharp

One functions codebase (`apps/functions`). This change adds the upload trigger (`uploads/**` finalized). Later changes add file cleanup when an image doc is deleted (`add-public-gallery`) and the artist fan-out (`add-artists`).

- *Why:* the Resize Images extension writes resized files but does not update Firestore. It would need its own event-handler function, plus a delete function, so three moving parts instead of one codebase. sharp also handles color profiles properly, which matters for art.
- *Alternatives:* resizing in the admin browser (rejected: canvas re-encoding can shift colors on wide-gamut files, and the browser would end up writing `status`); the Resize Images extension (rejected for the reasons above).

### A2 - Storage is closed to public reads; token URLs live in the doc

Storage rules allow no public reads at all. The function creates download-token URLs (Admin SDK `getDownloadURL`) and writes them into `images/{id}.files`. Whoever can read the doc gets the URLs, so Firestore rules are the only gate. Visitors' browsers will load the web versions through the public site instead (A14 in `add-public-gallery`), so only master downloads (and the admin) use token URLs directly. Spike S1 confirmed token URLs keep working while Storage rules deny all reads.

- *Why:* drafts' files are unreachable because their URLs only exist in docs the rules hide. There is no per-view cost and no lag between publishing and the images working.
- *Alternatives:* public files protected only by unguessable paths (draft files guessable by ID); Storage rules that `firestore.get()` the doc (one billed read per image view, so a 40-tile grid costs 40 reads); a `published` metadata flag kept in sync by a third trigger (publish lag, more code).
- *Trade-off:* a token URL keeps working for anyone who saved it after an image is unpublished. The function can revoke tokens if that ever matters.

### A13 - Upload pipeline: master, web versions, preview; upload deleted

```
uploads/{id}/file  --(finalize, uploads/** only)-->  function
   |- master.<ext>   same format as uploaded, pixels untouched, metadata removed,
   |                 colour profile kept; Content-Disposition sets a readable
   |                 filename (e.g. artist-title-date.ext)
   |- full.webp      1200px, thumb.webp 400px (animated if the source is),
   |                 WebP 'drawing' preset, never upscaled
   |- preview.jpg    still image, first frame if animated, used for og:image (SFW only)
   |- Cache-Control  public, max-age=31536000, immutable on all outputs
   |- doc            status ready, files, animated, width, height, masterName
   '- delete uploads/{id}/...   only after every output is written and the doc is ready
on failure: status error + message; the upload is kept so the owner can retry
```

- **Every master is downloadable.** Its URL is always in the doc.
- **Metadata stripping without re-encoding** needs a small format-specific step, because sharp always re-encodes. Spike S5 proved the approach: a parser per format copies the file block by block and drops only whole metadata blocks, so every byte that carries pixels, colour or animation is unchanged:
  - JPEG: keeps JFIF `APP0`, `ICC_PROFILE` `APP2`, Adobe `APP14` (colour transform) and all image segments; drops every other `APPn` (EXIF, XMP, IPTC/Photoshop, MPF), `COM`, and anything after `EOI`.
  - PNG/APNG: keeps `IHDR`, `PLTE`, `IDAT`, `IEND`, `tRNS`, colour chunks (`iCCP`, `sRGB`, `gAMA`, `cHRM`, `cICP`, `mDCV`, `cLLI`, `sBIT`), `bKGD`, `pHYs` and the APNG chunks (`acTL`, `fcTL`, `fdAT`); drops text, time, `eXIf` and private chunks; refuses unknown critical chunks.
  - GIF: keeps graphic control (timing, disposal, transparency), plain text, `NETSCAPE2.0`/`ANIMEXTS1.0` (looping) and `ICCRGBG1012` (colour profile); drops comments and other application blocks (XMP).
  - WebP: keeps `VP8X`, `ICCP`, `ANIM`, `ANMF`, `ALPH`, `VP8 `, `VP8L`; drops `EXIF`, `XMP ` and unknown chunks, clears their `VP8X` flags and rewrites the RIFF size.
  - When the source's EXIF orientation is not 1, a minimal EXIF holding only the orientation is written back, so photos still display upright.
  - The stripper moves into `apps/functions` with small synthetic fixtures; artists' originals are not committed.
- **Animated sources** (GIF/APNG/animated WebP) are detected by `pages > 1` and processed with `{ animated: true }`.
- **A size guard** (width × height × frames) rejects absurd inputs with a clear error.
- **Function settings:** 2 GiB memory, 300 s timeout, concurrency 1, max 3 instances, automatic retries off.
- **Replacing an image's file** issues new token URLs, so caches update without versioned filenames. The public `/img` addresses (A14) carry a version taken from the token, so they change too.
- *Why "same format as delivered":* re-encoding a JPEG to lossless WebP makes it 2-3x larger with no quality gain. WebP downloads are awkward for many users. Untouched pixels are the only real guarantee of "original".
- *Why the upload is deleted:* the master replaces it, and keeping uploads in a separate prefix stops the function from triggering on its own output.

## Risks / Trade-offs

- [Metadata stripping without re-encoding could miss metadata or corrupt unusual files] → spike S5 passed on real artist files; the stripper refuses unknown critical PNG chunks instead of guessing.
- [The upload is deleted, so a processing bug can't be undone] → delete only after every output is written; the owner keeps the original files outside the gallery.
- [A very large or long animated upload could exhaust the function] → the size guard (A13) rejects it with a clear error; 2 GiB memory and concurrency 1.

## Open Questions

- Exact WebP quality settings and the `preview.jpg` dimensions. These are tuned on real art during implementation.

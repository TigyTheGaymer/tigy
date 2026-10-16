# Proposal

## Why

The gallery starts with getting images in. The owner needs a private place to upload commissioned art, and every upload has to become files the gallery can safely show and offer for download: a lossless original without private metadata, web-sized versions, and a link-preview image. Nothing public can be built until those files exist.

Depends on `setup-gallery-platform` (workspace, Firebase project, delivery pipeline).

## What Changes

- **Owner sign-in** to the admin site with Google, owner only, not indexed by search engines.
- **Adding images** in the admin: create an entry, upload its file, optionally fill in its fields, and watch its processing status live.
- **Per-image catalog entries**: every image is its own entry with a permanent ID and optional fields.
- **Image processing** on the backend: each upload becomes a lossless downloadable master in its original format (metadata stripped), two web sizes and a link-preview image. Animated GIF/APNG/WebP are supported. The raw upload is deleted afterwards. A failed image can be retried by replacing its file.
- **Security rules** for writes and files: only the owner writes, uploads are limited to images of at most 20 MB, processing results are written by the backend only, and stored files are closed to direct public reads.
- **Shared models**: the `Image` types and the download-filename helper in `libs/models`.

Out of scope: editing, publishing and deleting images and everything visitors see (`add-public-gallery`), NSFW display (`add-nsfw-handling`), artists (`add-artists`), and visual design (separate UI/UX change).

## Capabilities

### New Capabilities

- `image-catalog`: image entries, their permanent IDs and fields.
- `image-processing`: turning an upload into the master, web versions and preview image; metadata stripping, animation handling, size limits, processing status and replacing a file.
- `admin-console`: owner sign-in, adding images, and seeing processing status.
- `access-control`: who may write data and files, and that stored files are not publicly readable, enforced by Firestore and Storage security rules.

### Modified Capabilities

None.

## Impact

- **Code**: `libs/models` (image types, filename helper), `apps/functions` (upload trigger with sharp and the metadata stripper), `apps/admin` (sign-in, add image, image list), `firebase` (Firestore and Storage rules).
- **Dependencies**: `sharp` and the Firebase Admin SDK in functions; the Firebase JS SDK with Auth, Firestore and Storage in the admin.
- **Firebase**: the first deployed function (`europe-west6`, 2 GiB, 300 s); Storage starts holding files.
- **Docs**: apps/functions/README.md and apps/admin/README.md.

# Proposal

## Why

After `add-image-upload`, the owner can get images in, but nobody can see them. This change turns the processed images into a public gallery: the owner edits, publishes and deletes entries, and visitors browse the published images, open each one on its own page, download the original, and share links with proper previews.

Depends on `add-image-upload` (image entries, processed files, owner sign-in).

## What Changes

- **Editing, publishing and deleting** in the admin: edit an image's details (title, date, set, NSFW flag, description), publish or unpublish it once it is ready, and delete it together with all of its files.
- **Drafts and sets**: images are drafts until published; images in the same set (e.g. clean and NSFW versions of one piece) are linked.
- **Public site** (Angular with server-side rendering): a gallery of published images, 24 per page, newest first, and a page per image (`/i/{id}`) with its details, its other versions and a download of the full-resolution original.
- **Web images through the CDN**: thumbnails, full views and preview images are served from the public site's own image route, so visitors anywhere load them from a nearby cache.
- **Link previews and crawlers**: pages arrive as complete HTML, and shared links show the image's preview, title and artist. NSFW images never appear in previews.
- **NSFW kept out for now**: public lists and the other versions on an image page leave NSFW images out entirely. `add-nsfw-handling` adds the visitor's switch.
- **Security rules** for public reads: drafts are unreadable from the public site, public queries are capped at 24 entries, and publishing requires a ready image.

Out of scope: the NSFW switch, confirm screen and search exclusion (`add-nsfw-handling`), artist credit and artist pages (`add-artists`), and visual design and browsing controls (separate UI/UX change).

## Capabilities

### New Capabilities

- `public-gallery`: what visitors can see and do: gallery, image pages, downloads, web image delivery, link previews, crawler-friendly pages and page freshness.

### Modified Capabilities

- `image-catalog`: drafts and publishing, sets, ordering and paging of published images.
- `admin-console`: editing image details, publishing and unpublishing, deleting images.
- `image-processing`: files are removed with their image.
- `access-control`: public reads of published images only, query size limit, publishing requires a ready image.

## Impact

- **Code**: `libs/models` (`sortDate` helper), `apps/admin` (edit, publish, delete), `apps/functions` (cleanup on delete), `apps/public` (gallery, image page, `/img` route, link previews), `firebase` (read rules, composite index).
- **Dependencies**: `firebase/firestore/lite` in the public site's server.
- **Firebase**: App Hosting rollouts now carry real pages; `apphosting.yaml` is added.
- **Docs**: apps/admin/README.md, apps/functions/README.md, apps/public/README.md.

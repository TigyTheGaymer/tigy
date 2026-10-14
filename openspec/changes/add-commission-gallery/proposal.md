# Proposal

## Why

Tigy's art commissions currently have no home: there is no place to show the pieces together with credit to the artists who made them. This change builds that gallery: a public site where visitors browse and download the art and find the artists, and a private admin where the owner uploads images and enters their details.

## What Changes

- New **public site** (Angular with server-side rendering): a gallery of published images, a page per image (`/i/{id}`), and a page per artist (`/artists/{id}`). Each image shows its artist credit and links, date, title, set and description, and its full-resolution original can be downloaded.
- New **admin site** (Angular single-page app, Google sign-in, owner only): upload images, enter and edit image and artist details, and publish or unpublish images.
- **Per-image catalog**: every image is its own entry with optional fields; images are drafts until published; images in the same set (e.g. clean and NSFW versions of one piece) are linked.
- **Artists** are separate records holding public links only, picked from a list when adding an image.
- **Mature content**: every image has an NSFW flag. NSFW images are hidden by default behind a visitor-controlled switch, sit behind a confirm screen on direct links, and never appear in link previews or search results.
- **Image processing** on the backend: each upload becomes a lossless downloadable master in its original format (metadata stripped), two web sizes and a link-preview image. Animated GIF/APNG/WebP are supported. The raw upload is deleted afterwards.
- **Security rules** are the only access gate: drafts and the admin's data are unreachable from the public site, Storage is closed to direct public reads, and public queries are capped in size.
- **Automated delivery**: every push to `main` builds, tests and deploys whatever changed (Nx affected) through one GitHub workflow.

Out of scope for this change: visual design, layout and browsing UI details (sorting/filter controls, infinite scroll vs. "load more", footer notice, cookie banner), custom domain, App Check, video commissions, multiple admins.

## Capabilities

### New Capabilities

- `image-catalog`: image entries and their fields, IDs and URLs, sets, draft/published state, ordering and paging of published images.
- `artist-directory`: artist records with public links, how artist details appear on images, and what happens to images when an artist is edited or deleted.
- `image-processing`: turning an upload into the master, web versions and preview image; metadata stripping, animation handling, size limits, processing status, and file cleanup on delete.
- `public-gallery`: what visitors can see and do: gallery, image and artist pages, the NSFW switch and confirm screen, downloads, link previews and search visibility, and page freshness.
- `admin-console`: owner sign-in and managing images and artists: upload, edit, publish, and see processing status.
- `access-control`: who may read and write which data and files, enforced by Firestore and Storage security rules.

### Modified Capabilities

None. No specs exist yet.

## Impact

- **Repository**: a new Nx workspace layout with `apps/public`, `apps/admin`, `apps/functions`, a shared `libs/models`, and a `firebase` project for rules and indexes.
- **Firebase (new project, Blaze plan)**: Firestore, Cloud Storage and Cloud Functions in Zurich (`europe-west6`); App Hosting in the Netherlands (`europe-west4`); Firebase Hosting for the admin; Firebase Auth with Google sign-in.
- **Dependencies**: Angular with `@angular/ssr`, Firebase JS SDK (`firestore/lite` for public reads), Firebase Admin SDK and `sharp` in functions, Firebase CLI in CI.
- **CI/CD**: a GitHub Actions workflow with keyless Google Cloud auth (Workload Identity Federation); App Hosting's own automatic rollouts turned off.
- **Cost**: expected to stay in cents per month at personal-gallery traffic; budget alerts guard against spikes.
- **Docs**: `PRODUCT.md` still says the product purpose is undecided and needs updating before UI work.

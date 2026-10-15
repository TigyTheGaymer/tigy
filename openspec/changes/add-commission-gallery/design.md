# Design

## Context

See proposal.md for motivation and scope. The repo has no app code yet: no Nx workspace, no Angular apps, no Firebase project. It is on GitHub (`TigyTheGaymer/tigy`), and commits go directly to `main`.

The decisions below were settled in two passes:
- **Product decisions (#1-#11)**, carried over from the owner's earlier `decisions.md` (2026-10-14).
- **Architecture decisions (A1-A13)**, settled in an explore session (2026-10-14/15).

A short list of spikes must pass in the real Firebase project before launch.

There is a single owner, who is the only admin and the only developer. Visitors are worldwide. Expected traffic is personal-gallery scale (hundreds to low thousands of visits a month), which keeps every service close to or within its free usage.

## Goals / Non-Goals

**Goals:**
- Security rules are the single access gate. No public path to drafts depends on UI code behaving correctly.
- Every public page is one Firestore query with no follow-up lookups.
- The image files the public sees are produced by one backend pipeline, never directly by the browser.
- Every push to `main` deploys exactly what changed, in a safe order, with no manual steps.
- The bill stays at cents per month at the expected traffic, and alerts fire before a spike becomes expensive.

**Non-Goals:**
- Visual design, layout, and browsing controls (sort/filter UI, infinite scroll vs. "load more"). These belong to a separate UI/UX change.
- Multiple admins, roles, or custom claims.
- App Check, a custom domain, video commissions, and scheduled backups.
- A separate hosted dev/staging environment.

## Decisions

### Product decisions carried over (#1-#11)

1. **Artists are separate records.** Each artist is entered once, picked from a list, and gets their own page.
2. **Everything is per image, not per commission.** Each image is its own gallery entry with its own artist, date, fields and NSFW flag.
3. **Every image has an NSFW flag.** How flagged images are shown is covered in #9.
4. **An optional "set" links variants of the same piece** (e.g. clean and NSFW versions). The admin picks a set from the existing values (with autocomplete) instead of typing free text, so typos can't split a set. A set is a shared value, not a separate collection.
5. **Every field is optional except the image file.** Images without a date sort by the date they were added (see A5 for how that is stored).
6. **IDs are Firestore auto-IDs, created in the admin before upload** (`doc(collection(...)).id`). The same ID is used for the Firestore doc, the Storage path and the URL (`/i/{id}`), so links never change when fields are edited. Artists get the same kind of ID (`/artists/{id}`).
7. **Image fields:** image file, title, artist, date, set, NSFW flag, description. Character, type and price are not included yet.
8. **Artist records hold public links only:** a name plus a free list of links (label + URL). No private contact data is stored.
9. **NSFW images sit behind a "show NSFW" switch.** They are hidden by default, and the visitor's choice is remembered in their browser. A direct link to an NSFW image shows a confirm screen first. NSFW images are never used in link previews or SEO.
10. **New images are drafts until published.** This is enforced in security rules, not just the UI.
11. **Free Firebase addresses for now:** the public site on App Hosting (`*.hosted.app`), the admin on Hosting (`*.web.app`). A custom domain can be added later.

**Defaults kept from the earlier decision round:** web versions are 400px (grid) and 1200px (full view) WebP. Metadata is stripped. The upload limit is 20 MB. There is no watermark. Image files are deleted when an entry is deleted. Admin sign-in uses Google, and the rules check the owner's exact UID. The admin site is not indexed. Backups are an occasional manual export.

**Override:** "originals kept private" no longer applies. Originals become public downloads (A13).

### System overview

```
  visitors (worldwide)
      |
      v
  Cloud CDN --miss--> App Hosting: apps/public (Angular SSR)   [NL europe-west4]
                          |
                          | firestore/lite, anonymous (rules apply)
                          v
  owner --> Hosting: apps/admin (SPA) --> Firestore / Storage   [CH europe-west6]
            Google sign-in                      ^        |
                                                |        v
                                       apps/functions (sharp)  [CH europe-west6]

  libs/models: shared Image / Artist types for all three apps
  firebase (Nx project): firestore.rules, storage.rules, firestore.indexes.json
```

### Data model

```
images/{id}
  title?, description?, date?, set?, nsfw
  artistId?                       reference to artists/{id}
  artist?   { name, links[] }     copy of the artist record for display (A6)
  published                       false until the owner publishes (#10)
  sortDate                        date ?? createdAt (A5)
  createdAt, updatedAt
  status    processing|ready|error   written by functions only
  error?                             written by functions only
  animated, width, height            written by functions only
  files     { master, full, thumb, preview }   token URLs, functions only
  masterName                         download filename, functions only

artists/{id}
  name, links[{ label, url }]
```

Storage layout:

```
uploads/{id}/<original name>     temporary, owner-only; deleted after processing
images/{id}/master.<ext>         lossless master, same format as uploaded
images/{id}/full.webp            1200px (no upscaling), animated if the source is
images/{id}/thumb.webp           400px, animated if the source is
images/{id}/preview.jpg          still image (first frame) for link previews
```

### A1 - Image processing is our own functions code using sharp

One functions codebase (`apps/functions`) with these triggers: upload processing (`uploads/**` finalized), artist fan-out (A6), and file cleanup when an image doc is deleted.

- *Why:* the Resize Images extension writes resized files but does not update Firestore. It would need its own event-handler function, plus a delete function, so three moving parts instead of one codebase. sharp also handles color profiles properly, which matters for art.
- *Alternatives:* resizing in the admin browser (rejected: canvas re-encoding can shift colors on wide-gamut files, and the browser would end up writing `status`); the Resize Images extension (rejected for the reasons above).

### A2 - Storage is closed to public reads; token URLs live in the doc

Storage rules allow no public reads at all. The function creates download-token URLs (Admin SDK `getDownloadURL`) and writes them into `images/{id}.files`. Whoever can read the doc gets the URLs, so Firestore rules are the only gate.

- *Why:* drafts' files are unreachable because their URLs only exist in docs the rules hide. There is no per-view cost and no lag between publishing and the images working.
- *Alternatives:* public files protected only by unguessable paths (draft files guessable by ID); Storage rules that `firestore.get()` the doc (one billed read per image view, so a 40-tile grid costs 40 reads); a `published` metadata flag kept in sync by a third trigger (publish lag, more code).
- *Trade-off:* a token URL keeps working for anyone who saved it after an image is unpublished. The function can revoke tokens if that ever matters.

### A3 - The public SSR reads as an anonymous visitor; server HTML is always SFW

The SSR server uses `firebase/firestore/lite`, not signed in, so the same rules apply to it as to any visitor. Server-rendered HTML always shows the SFW view. The NSFW switch is applied in the browser after hydration. A direct link to an NSFW image renders the confirm screen on the server, the same for everyone. The first page's data is handed to the browser through TransferState.

- *Why:* if the server read the NSFW cookie, the CDN would need a cached copy per cookie, so caching would stop working. Crawlers and link-preview bots only ever see server HTML, so NSFW can't leak into previews or SEO (#9). Reading through the rules means a forgotten `published == true` filter fails safely.
- *Alternatives:* the Admin SDK on the server (bypasses rules, so every query must re-implement the gate); NSFW-aware server rendering (breaks CDN caching).

### A4 - SSR pages are cached at the CDN for 5 minutes

SSR responses carry `Cache-Control: public, s-maxage=300` (exact header values are settled during implementation). App Hosting routes every request through Cloud CDN. The docs describe no on-demand purge, so freshness is bounded by the cache time.

- *Why:* a page loads instantly from a nearby edge and a traffic spike costs almost nothing. A newly published image appears within about 5 minutes, which the owner accepted. Browser navigation after hydration reads live data, so only first loads can be stale.
- *Alternatives:* 1 minute (more renders, little gain) or 1 hour (publishing feels broken).

### A5 - Paging: 24 at a time, ordered by `sortDate` then document ID

Public lists query `published == true` (plus `nsfw == false` when the switch is off), `orderBy(sortDate desc)`, `orderBy(documentId)`, `limit(24)`, and use `startAfter` cursors.

- `sortDate` is written by the admin on every save as `date ?? createdAt`. Firestore's `orderBy` leaves out documents missing the field, so sorting by the optional `date` alone would hide undated images.
- The document-ID tiebreaker keeps the order fully stable when many images share a `sortDate`, so pages never skip or repeat images.
- The server renders page 1. Further pages are fetched from the browser.
- Required composite indexes: (`published`, `nsfw`, `sortDate`, id), (`published`, `sortDate`, id), and the artist-page equivalents with `artistId`.

### A6 - The artist's public record is copied onto each image

`images/{id}.artist = { name, links }`. The admin writes the copy together with `artistId` when an artist is assigned. When an artist doc is updated, a function queries `images where artistId == id` and updates every copy with `BulkWriter` (no 500-write batch limit), drafts included.

- *Why:* the gallery and image pages need no second read. Artist edits are rare, and a fan-out of a few dozen writes is negligible.
- *Alternatives:* a join at read time (one extra read per distinct artist on every page); a single `meta/artists` map doc (one read for all names, but another special doc to maintain; its map would need indexing disabled to stay under the 40,000 index-entries limit).
- *Trade-off:* after an edit, copies are stale for a second or two.

### A7 - Deleting an artist leaves its images untouched

Images keep `artistId` and their `artist` copy, so the credit and links stay visible. The artist page for a deleted ID shows "not found", which it must handle anyway. The admin can flag images whose `artistId` no longer exists, since it already loads the full artist list.

- *Alternatives:* blocking the delete until images are reassigned; automatically unlinking images (removes the credit silently).

### A8 - Regions: Zurich for data and functions, Netherlands for App Hosting

Firestore, Storage and Functions are in `europe-west6` (Zurich). App Hosting is in `europe-west4` (Netherlands), the only European App Hosting region. The Firestore location is permanent.

- *Why:* the owner wants the data in Switzerland. The SSR server only crosses regions on a CDN cache miss.
- *Alternatives:* `us-central1` for everything (Storage free tier and 100 GB/month free egress; $0 at this scale); `europe-west4` for everything (one region, Tier 1 function pricing).
- *Trade-off:* Storage has no free tier outside `us-east1`, `us-west1` and `us-central1`, and Zurich functions are Tier 2. At the expected traffic this comes to roughly $0.20-$2 a month, mostly visitor downloads.

### A9 - Superseded by A13

(Was: keep the original as uploaded and private, with lossy WebP for the two web sizes.)

### A10 - One Firebase project plus the local Emulator Suite

Everyday development runs against the emulators (Firestore, Storage, Functions, Auth), including rules tests. Spikes run in the real project before launch, while nothing is public.

- *Alternatives:* separate dev and prod projects (twice the setup, billing and config for a single developer).

### A11 - Every push to `main` deploys what changed, through one GitHub workflow

```
push to main
  -> nx-set-shas            base = last commit that deployed successfully
  -> nx affected -t lint test build      (nothing deploys if this fails)
  -> stage 1  tag:backend   firebase  (rules + indexes), functions
  -> stage 2  tag:frontend  admin  -> firebase deploy --only hosting
                            public -> firebase apphosting:rollouts:create --git-commit $SHA
```

- App Hosting's own automatic rollouts are **off**, so the workflow is the only thing that ships the public site. Backend always deploys before frontends.
- The order comes from two tag-based stages, not Nx dependencies. Making `public` depend on `firebase` would mark it affected on every rules change and trigger pointless rollouts.
- Rules and indexes form their own Nx project (`firebase`), so `affected` sees changes to them.
- A workflow `concurrency` group keeps two deploys from overlapping.
- Auth uses Workload Identity Federation (no service-account key stored in GitHub). The deploy service account only gets the roles it needs.
- App Hosting setup: root directory `apps/public`; the Angular application builder; the lock file committed; Node 22 or later.
- *Alternatives:* App Hosting auto-rollout alongside a workflow for the rest (two triggers, and the public site could ship before its rules or indexes); manual deploys from the laptop.

### A12 - No App Check at launch

App Check conflicts with A3 (an anonymous SSR server has no browser to produce a token) and with A2 (`<img>` token URLs can't send an App Check header). Abuse is limited instead by:

- Firestore rules allowing public list queries only with `request.query.limit <= 24`.
- Budget alerts at a few thresholds.
- A known path to add App Check later, which would mean reworking A3.

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
- **Metadata stripping without re-encoding** needs a small format-specific step (removing JPEG/PNG/GIF metadata blocks), because sharp always re-encodes.
- **Animated sources** (GIF/APNG/animated WebP) are detected by `pages > 1` and processed with `{ animated: true }`.
- **A size guard** (width × height × frames) rejects absurd inputs with a clear error.
- **Function settings:** 2 GiB memory, 300 s timeout, concurrency 1, max 3 instances, automatic retries off.
- **Replacing an image's file** issues new token URLs, so caches update without versioned filenames.
- *Why "same format as delivered":* re-encoding a JPEG to lossless WebP makes it 2-3x larger with no quality gain. WebP downloads are awkward for many users. Untouched pixels are the only real guarantee of "original".
- *Why the upload is deleted:* the master replaces it, and keeping uploads in a separate prefix stops the function from triggering on its own output.

## Risks / Trade-offs

- [Token URLs might stop working if Storage rules deny all reads] → spike S1 before launch. Fallback: per-file public-read rules for `images/**` outputs (draft files then rely on unguessable IDs).
- [Storage downloads may not be edge-cached, so faraway visitors load images from Zurich] → spike S2. The 1-year `Cache-Control` helps repeat visits. Fallback: serve images through the App Hosting CDN.
- [The Firebase CLI might not work with keyless auth in GitHub Actions] → spike S3. Fallback: a narrowly scoped service-account key in GitHub secrets.
- [The current Angular/Nx versions may be newer than what App Hosting officially supports; the docs list Angular 19.2.x and Nx 20.8.x] → spike S4. Fallback: pin to the newest versions App Hosting lists as supported.
- [Metadata stripping without re-encoding could miss metadata or corrupt unusual files] → spike S5 on real files from the owner's artists.
- [The upload is deleted, so a processing bug can't be undone] → delete only after every output is written; the owner keeps the original files outside the gallery.
- [Master downloads (5-20 MB each) are the most attractive target for bill abuse] → budget alerts (A12). A billing kill switch remains a drastic last resort.
- [Newly deployed composite indexes take minutes to build; a public rollout right after can briefly fail new queries] → rare (only when a new query shape is added) and fixes itself.
- [Artifact Registry keeps every App Hosting build; only 0.5 GB is free] → cleanup policy that keeps the last few images.
- [Content can be up to 5 minutes stale after publishing] → accepted (A4).
- [Artist copies are briefly stale after an edit] → accepted (A6).
- [The workflow runs from the start, so unfinished features reach the live but unadvertised `*.hosted.app` and `*.web.app` addresses before launch] → accepted. Rules deny everything until each slice lands its own, and drafts are never public.

## Migration Plan

This is a new system, so there is nothing to migrate. Rollout order:

1. Create the Firebase project on the Blaze plan with Firestore, Storage and Functions in `europe-west6`, and set budget alerts.
2. Scaffold the Nx workspace and the `firebase` project, and set up the emulators.
3. Run spikes S1-S5 in the real project while it is still empty and private:
   - S1: token URLs work while Storage rules deny all reads.
   - S2: whether Storage downloads are edge-cached for faraway visitors.
   - S3: the Firebase CLI deploys from GitHub Actions with keyless auth.
   - S4: a current Angular + Nx SSR app builds and runs on App Hosting with root directory `apps/public`.
   - S5: metadata stripping without re-encoding works on real artist files (JPEG, PNG, GIF, APNG).
4. Turn on the GitHub workflow. Set App Hosting automatic rollouts to off. From then on every feature slice ships through it.
5. Build the features as vertical slices, each landing its own rules, indexes, functions and admin/public screens with their tests: owner sign-in, upload and processing, editing/publishing/deleting, public browsing, NSFW handling, artists, then link previews.

**Rollback:** App Hosting can roll out an earlier commit. Hosting keeps release history. Functions and rules roll back by redeploying an earlier commit through the workflow.

**Setup checklist:**
- Artifact Registry cleanup policy (keep the last few builds).
- Budget alerts (e.g. $5 / $20 / $50).
- App Hosting automatic rollouts off; root directory `apps/public`.
- Composite indexes, including the document-ID tiebreaker.
- Google sign-in as the only Auth provider; the owner's UID in the rules.
- Admin served with `noindex`.
- Workload Identity Federation and the deploy service account.

## Open Questions

- Exact WebP quality settings and the `preview.jpg` dimensions. These are tuned on real art during implementation.
- Exact budget-alert thresholds.
- The exact `Cache-Control` header value for SSR responses (any value within the 5-minute freshness budget).

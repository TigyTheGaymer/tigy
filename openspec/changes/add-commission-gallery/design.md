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
                          |   pages, plus /img/{id}/{v}/{name} for web versions (A14)
                          | firestore/lite, anonymous (rules apply);
                          | /img misses fetch the file via its token URL
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

Storage rules allow no public reads at all. The function creates download-token URLs (Admin SDK `getDownloadURL`) and writes them into `images/{id}.files`. Whoever can read the doc gets the URLs, so Firestore rules are the only gate. Visitors' browsers load the web versions through the public site instead (A14), so only master downloads (and the admin) use token URLs directly.

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
- **Replacing an image's file** issues new token URLs, so caches update without versioned filenames. The `/img` addresses (A14) carry a version taken from the token, so they change too.
- *Why "same format as delivered":* re-encoding a JPEG to lossless WebP makes it 2-3x larger with no quality gain. WebP downloads are awkward for many users. Untouched pixels are the only real guarantee of "original".
- *Why the upload is deleted:* the master replaces it, and keeping uploads in a separate prefix stops the function from triggering on its own output.

### A14 - Web versions are served through the public site's CDN

Spike S2 showed that Storage token URLs are not edge-cached: every request goes back to Zurich (0.7-4.4 s to first byte from the US, Tokyo and Sydney, against 20-70 ms for a CDN). So visitors load `thumb.webp`, `full.webp` and `preview.jpg` from the public site instead, where App Hosting's Cloud CDN caches them near the visitor.

```
GET /img/{id}/{v}/thumb.webp | full.webp | preview.jpg      (apps/public server route)
  -> read images/{id} with firestore/lite, anonymous (rules apply, as in A3)
       not readable (draft, unknown ID) -> 404, short cache
  -> fetch the file through the doc's token URL, stream it back
       Cache-Control: public, max-age=31536000, immutable, s-maxage=86400
```

- `{v}` is a short version taken from the file's current download token. Replacing a file issues new tokens (A13), so the address changes and no cache keeps the old image. The route always serves the image's current file; `{v}` only busts caches.
- Pages, link previews (`og:image`) and the gallery use `/img` addresses. Master downloads keep the direct token URL: they are large (5-20 MB, above Cloud CDN's ~10 MB cache limit for responses without range support) and rare. The admin keeps using token URLs, since it shows drafts the route can't serve.
- Browsers keep an image for a year. The CDN keeps it for a day (`s-maxage`), which bounds how long an unpublished image is still served to new visitors. Exact values are settled during implementation.
- *Why:* first loads outside Europe drop from seconds to the CDN's tens of milliseconds, while the rules stay the only gate.
- *Alternatives:* direct token URLs everywhere (slow first loads outside Europe); Firebase Hosting in front of Storage (Hosting can only rewrite to functions and Cloud Run, not proxy Storage); public-read files behind a separate CDN (gives up A2).
- *Trade-off:* each CDN miss costs one Firestore read plus a Zurich-to-Netherlands fetch. An unpublished image can stay cached at the CDN for up to a day.

## Risks / Trade-offs

- [Token URLs might stop working if Storage rules deny all reads] → spike S1 before launch. Fallback: per-file public-read rules for `images/**` outputs (draft files then rely on unguessable IDs).
- [Storage downloads are not edge-cached, so faraway visitors load images from Zurich] → confirmed by spike S2; web versions go through the App Hosting CDN (A14). Master downloads still come from Zurich; the 1-year `Cache-Control` helps repeat downloads.
- [Cloud CDN does not cache responses over ~10 MB from an origin without range support, so a very long animated `full.webp` would always be fetched from Zurich] → rare; it still works, just slower. The size guard (A13) limits how large outputs get.
- [An unpublished image stays cached at the CDN for up to a day (A14)] → accepted; the same applies today to anyone who saved a token URL (A2).
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

## Spike results

Run in `tigy-165cc` (default bucket `tigy-165cc.appspot.com`).

- **S4 - current Angular + Nx on App Hosting: passed, no pinning needed.** The owner created backend `public` (`europe-west4`, root directory `apps/public`, live branch `main`, automatic rollouts off). The scaffolded app (Angular 22.1, Nx 23.2, application builder) built and runs on the `nodejs24` runtime. `https://public--tigy-165cc.europe-west4.hosted.app/` returns server-rendered HTML (`ng-server-context="ssr"`, `ng-version="22.1.8"`) through Google's CDN (`via: 1.1 google`).

- **S1 - token URLs with deny-all Storage rules: passed, A2 stands.** With the placeholder rules (`allow read, write: if false`) deployed, a temporary function uploaded a test JPEG and called the Admin SDK's `getDownloadURL()`, then was deleted. The token URL returns 200 with the exact uploaded bytes and the `Cache-Control` set on upload (`public, max-age=31536000, immutable`). The same URL without the token, with a wrong token, the object's metadata URL, and the public `storage.googleapis.com` path all return 403. The fallback (public-read rules on `images/**`) is not needed.
- **S2 - edge caching of token URLs: not edge-cached.** Temporary probe functions in `us-central1`, `asia-northeast1` and `australia-southeast1` each fetched the S1 token URL (625 KB JPEG, `immutable`) six times, with a same-size file from cdnjs as a control. Every Storage response came from Google's storage front end (`Server: UploadServer`) with no `Age` or `Via` header, and repeats were no faster: time to first byte 0.7-1.9 s from the US and 2.7-4.4 s from Tokyo and Sydney (about 0.3 s from Switzerland). The control was served from cache (`Age` present) in 18-70 ms everywhere. Browser caching (1-year `immutable`) still helps repeat visits. Fallback adopted (owner, 2026-10-16): web versions are served through the App Hosting CDN, see A14.
- **S3 - keyless deploy from GitHub Actions: passed.** Workload identity pool `github` with OIDC provider `tigy-repo` (accepts only `TigyTheGaymer/tigy` on `refs/heads/main`), and service account `github-deploy` that the repo may impersonate (`roles/iam.workloadIdentityUser`), holding only `roles/firebaserules.admin` and `roles/serviceusage.serviceUsageConsumer`. The workflow `.github/workflows/s3-spike.yml` (`google-github-actions/auth@v2`, then `npx firebase deploy --only firestore:rules`) succeeded on push to `main` with no key stored in GitHub. The Firebase CLI picks up the federated credentials as Application Default Credentials. Task 4.2 adds the roles for functions, Hosting and App Hosting deploys. When granting roles to a freshly created service account, the first grant can fail with "does not exist" for a few seconds; retry it.
- **S5 - metadata stripping without re-encoding: passed.** A small parser per format copies the file block by block and drops only whole metadata blocks, so every byte that carries pixels, colour or animation is unchanged:
  - JPEG: keeps JFIF `APP0`, `ICC_PROFILE` `APP2`, Adobe `APP14` (colour transform) and all image segments; drops every other `APPn` (EXIF, XMP, IPTC/Photoshop, MPF), `COM`, and anything after `EOI`.
  - PNG/APNG: keeps `IHDR`, `PLTE`, `IDAT`, `IEND`, `tRNS`, colour chunks (`iCCP`, `sRGB`, `gAMA`, `cHRM`, `cICP`, `mDCV`, `cLLI`, `sBIT`), `bKGD`, `pHYs` and the APNG chunks (`acTL`, `fcTL`, `fdAT`); drops text, time, `eXIf` and private chunks; refuses unknown critical chunks.
  - GIF: keeps graphic control (timing, disposal, transparency), plain text, `NETSCAPE2.0`/`ANIMEXTS1.0` (looping) and `ICCRGBG1012` (colour profile); drops comments and other application blocks (XMP).
  - WebP (added because the spec accepts WebP uploads): keeps `VP8X`, `ICCP`, `ANIM`, `ANMF`, `ALPH`, `VP8 `, `VP8L`; drops `EXIF`, `XMP ` and unknown chunks, clears their `VP8X` flags and rewrites the RIFF size.
  - When the source's EXIF orientation is not 1, a minimal EXIF holding only the orientation is written back, so photos still display upright.

  Verified on synthetic fixtures with GPS, camera data, XMP, P3 profiles, a rotated JPEG, an animated GIF, an APNG and still and animated WebP, and on four real artist files (JPEG, PNG, WebP with an ICC profile, and a 24-frame animated GIF): pixels identical for every frame (sharp, plus upng for APNG frames), frame delays and loop count kept, ICC profile byte-identical, no EXIF/XMP/IPTC left apart from the orientation (checked with exifr and sharp), and stripping a second time changes nothing. The real files carried almost no metadata (one JPEG comment), as drawing-app exports usually do, so GPS/camera removal and APNG are covered by the synthetic fixtures only. Task 7.4 moves the stripper into `apps/functions` with small synthetic fixtures; artists' originals are not committed.

## Open Questions

- Exact WebP quality settings and the `preview.jpg` dimensions. These are tuned on real art during implementation.
- Exact budget-alert thresholds.
- The exact `Cache-Control` header value for SSR responses (any value within the 5-minute freshness budget).

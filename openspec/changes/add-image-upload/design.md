# Design

## Context

See proposal.md for why this change exists. What is already in place:

- **The data model** (`define-data-model`): `images/{id}` with its `file` details, fixed file names (`images/{id}/thumb.webp`, `full.webp`, `original.{ext}`, built by `imagePaths` in `libs/models`), `sortDateFor()` in `libs/gallery`, and the trigger `onImageWritten` that keeps `meta/gallery` and `meta/tags` current and deletes `images/{id}/` when an image is deleted. Unpublished images get no gallery row.
- **The owner claim** (`define-data-model` D8): the Firestore and Storage rules and `requireOwner()` check `owner: true`, but nothing sets it yet. D8 left the sign-up blocking function to the admin sign-in, which is this change.
- **Storage rules** let anyone `get` (not list) `images/{id}/*` and let the owner write there. The public server reads the files with the Admin SDK and serves them from its own address.
- **Spike S5** (`setup-gallery-platform`): a metadata stripper for JPEG, PNG/APNG, GIF and WebP that copies a file block by block and drops only whole metadata blocks. It passed on synthetic fixtures and four real artist files. Its code is in the git-ignored `tmp/spikes/s5/strip.js`, so this change moves it into the repository.
- **The seed** already makes web versions with sharp (fit inside 2048 and 720 pixels, WebP quality 82, animated kept), which the public pages were built and tested against.
- **The admin** (`apps/admin`) is a scaffold: an empty route list, no Firebase client, no styles. Its production budget warns at 500 kB initial.
- **Functions** run in `europe-west6` with `maxInstances: 10` by default; `global-options.ts` expects heavy functions such as upload processing to set their own limits. Their tests run against the Firestore and Storage emulators.

## Goals / Non-Goals

**Goals:**
- One path from a file to the public: the browser uploads, a function makes every public file. No browser writes under `images/`.
- An upload can fail without leaving a half-made artwork or stray files.
- The admin stays a plain, quick tool: the owner's time goes into the art, not the interface.

**Non-Goals:**
- Resumable uploads across page loads, and uploads from other devices or apps.
- A hand-made design for the admin. It uses spartan-ng's components with a Tigy accent colour.
- Reusing the admin's components or Tailwind on the public site.

## Decisions

### U1. The upload's ID is the artwork's ID

```
admin                         Storage                         processUpload (trigger)
  pick files                    uploads/{id}/source             create uploads/{id}  processing
  id = new Firestore auto-ID  --upload, progress-->  finalize -->  strip, resize, write files
                                                                   create images/{id}  unpublished
                                                                   uploads/{id}  ready | failed
  live list of uploads/*  <------------------------------------   delete uploads/{id}/source
```

For each file the admin takes a new Firestore auto-ID (`doc(collection(db, 'images')).id`, which writes nothing) and uploads to `uploads/{id}/source` with a resumable upload, the file's name in custom metadata and, as the content type, the format the admin read from the file's first bytes (U8). Processing uses the same ID for `images/{id}` and its files.

- *Why:* one ID end to end. The admin's row for a file, the upload record and the artwork never need matching, and a repeated trigger event finds the record it made earlier.
- *Alternative:* the admin creates `images/{id}` first and the function fills in `file`. That leaves images without files, which every reader of `Image` would have to handle, and gives browsers a write path to a half-made artwork.

### U2. Upload records are written only by functions

```
uploads/{uploadId}          uploadId = the artwork's ID
  fileName   string         as picked by the owner
  bytes      number         as uploaded
  status     'processing' | 'ready' | 'failed'
  error?     'unsupported' | 'damaged' | 'too-large' | 'internal'
  file?      { w, h, bytes, mime, animated }   when ready, copied from the image
  createdAt, updatedAt
```

- The function creates the record when it starts, with `create()`: if the record exists, another delivery of the same event got there first and this one stops. Eventarc can deliver an event more than once, and retries (U3) deliver it again after a run that never finished.
- While a file is still uploading there is no record yet. The admin keeps those rows in memory, with their progress, and merges them with the live records by ID. A row stays "processing" from the end of the upload until its record appears.
- `error` is a code, and the admin turns it into words, so the wording can change without touching stored records.
- A record still `processing` 10 minutes after `createdAt` is shown as failed, "took too long" (the function times out after 9). The admin works this out from the time; the record itself is never updated, since no function is left to do it.
- `file` is copied from the image so the list needs no image reads. A piece's file never changes, so the copy can't go stale.
- The owner may delete a record (clearing the row). A trigger on that delete removes `uploads/{id}/` and, when no `images/{id}` exists, everything under `images/{id}/`. That cleans up after a run that crashed or was killed halfway. For a ready upload the image exists, so nothing is touched.
- *Alternative:* a `status` on the image itself. Simpler to list, but `Image` would gain states the public code and the summaries must skip, and failed uploads would sit among the artworks.

### U3. The processing function

`processUpload` is an `onObjectFinalized` trigger on the default bucket: 4 GiB of memory, 2 CPUs, a 540-second timeout, `concurrency: 1`, `maxInstances: 2` and `retry: true`. Storage triggers cannot filter by path, so it returns at once for anything but `uploads/{id}/source`, including its own writes under `images/`. Only then does it load sharp, with `await import('sharp')`.

Steps, all inside one try block:
1. If the source no longer exists, stop: an earlier run finished with it, or the lifecycle rule (U6) removed it. Create the record (U2). Download the source and detect the format from its first bytes with `detectImageFormat` (U8). Anything but JPEG, PNG, GIF or WebP fails as `unsupported`.
2. Read the header with sharp (`metadata()`, no decoding). If width × height × frames is more than 250 million pixels, fail as `too-large` before decoding anything.
3. Strip the metadata (U4) and save `images/{id}/original.{ext}`, with the extension and content type of the detected format.
4. Make the web versions from the stripped original (U5) and save `full.webp` and `thumb.webp`.
5. Create `images/{id}` with `create()`: `published: false`, `nsfw: false`, empty credits and tags, `sortDate` from `sortDateFor(undefined, now)`, and `file` from U5.
6. Set the record to `ready` with its `file`, then delete the source.

Steps 3 and 4 save each file with a download token (`firebaseStorageDownloadTokens`, a random UUID). The Admin SDK adds none, and without one the browser SDK's `getDownloadURL()` throws `storage/no-download-url`, so the admin could not show thumbnails (U8). `get` on `images/` is public already, so a token URL exposes nothing new.

On any error: delete whatever step 3 or 4 wrote, delete the source, and set the record to `failed`. sharp's decoding errors become `damaged`, and anything else becomes `internal` and is logged. The handler then returns normally, so a failure that would recur (a damaged file) never loops.

Retries cover the runs that never finished: an event refused while both instances are busy, or an instance that crashed or timed out. A redelivered event stops at `create()` when the record exists, so a crashed run ends as "took too long" (U2) instead of starting over. Retries back off from 10 to 600 seconds for up to 24 hours.

- *Why retries:* without them an event refused at `maxInstances` may be dropped. The admin sends three files at a time, and the trigger's own writes under `images/` take the same two instances, so a dropped event would leave a source with no record and no row.
- *Why sharp is loaded inside the handler:* every function runs the same bundle and loads it on each cold start, and the blocking function (U7) must answer within 7 seconds. Loading sharp's native binary only after the path check keeps it out of every other function and out of the trigger's own writes.
- *Why 4 GiB and concurrency 1:* 250 million pixels decode to about 1 GB in RGBA, and resizing needs more on top. One upload per instance keeps that from doubling up. Billing is per second, and the other objects the trigger sees return in milliseconds.
- *Alternative:* a separate uploads bucket, so the trigger fires only for uploads. Cleaner events, but it means a second bucket with its own rules, emulator setup and deploy config, to save milliseconds of compute.
- *Alternative:* the Resize Images extension (tried in `tmp/spikes/ext`). It cannot strip metadata without re-encoding, cannot name files the way `imagePaths` does, and cannot create the artwork.

### U4. The metadata stripper moves into `apps/functions`

`apps/functions/src/uploads/strip-metadata.ts` ports `strip.js` to TypeScript, keeping its per-format rules:

| Format | Kept | Dropped |
|---|---|---|
| JPEG | JFIF APP0, ICC profile (APP2), Adobe APP14, all non-APP segments and image data up to EOI | every other APPn (EXIF, XMP, IPTC, MPF), COM, anything after EOI |
| PNG/APNG | `IHDR PLTE IDAT IEND tRNS`, colour chunks (`cHRM gAMA iCCP sBIT sRGB cICP mDCV cLLI`), `bKGD pHYs`, APNG `acTL fcTL fdAT` | text chunks, `eXIf`, `tIME`, other ancillary chunks, anything after IEND; an unknown critical chunk fails as `damaged` |
| GIF | header, colour tables, images, graphic control, plain text, `NETSCAPE2.0`, `ANIMEXTS1.0`, `ICCRGBG1012` | comments, other application extensions (XMP), anything after the trailer |
| WebP | `VP8X ICCP ANIM ANMF ALPH VP8 VP8L`, with VP8X's EXIF and XMP flags cleared | `EXIF`, `XMP `, other chunks, anything after the RIFF size |

An orientation other than 1 is put back as a minimal EXIF block holding only the orientation tag, so the original still displays upright. A file the parser cannot walk (cut off, or a length past the end) fails as `damaged`.

### U5. Web versions and file details

- `sharp(original, { animated: true }).rotate()`, then `resize({ width, height, fit: 'inside', withoutEnlargement: true })` to 2048 for `full.webp` and 720 for `thumb.webp`, then `webp({ quality: 82 })`. These are the seed's settings, with orientation applied. sharp converts to sRGB by default, which is what browsers assume for an untagged WebP.
- With `animated: true`, a GIF or animated WebP keeps its frames, delays and loop. libvips reads only the first frame of an APNG, so its web versions are still. The original keeps the animation, and `file.animated` is true.
- `file`: `w` and `h` as displayed (swapped for orientations 5 to 8; `pageHeight` for animated files), `bytes` of the stripped original (the download), `mime` of the detected format, `animated` when there is more than one frame, and `transparent` when the image has an alpha channel and `stats().isOpaque` is false. An alpha channel alone is common in drawing-app exports and doesn't mean the piece has a transparent background.

### U6. Rules

```
Storage
  uploads/{uploadId}/source     create: owner, size <= 50 MB, contentType image/(jpeg|png|gif|webp)
                                no read, update or delete from browsers
  images/{imageId}/{fileName}   get: anyone; no browser writes (was: owner)
  people/{personId}/avatar.webp unchanged (avatar uploads come with add-admin-editing)

Firestore
  uploads/{uploadId}            read: owner (existing catch-all); delete: owner; no create or update
```

- The content type in the rule is the one the admin set from the bytes it read (U1). A browser that bypasses the admin can declare any of the four types, so processing decides the format from the bytes again (U3).
- Taking writes under `images/` away from the owner closes the last browser path to public files. The seed and the functions use the Admin SDK, which the rules don't apply to.
- **Bucket lifecycle:** `firebase/storage-lifecycle.json` deletes objects under `uploads/` one day after they were created. It removes a source whose event was never processed, which no record or row would otherwise show. The Firebase CLI cannot deploy lifecycle rules, so the owner applies it once with `gcloud storage buckets update gs://tigy-165cc.appspot.com --lifecycle-file=firebase/storage-lifecycle.json` (Migration Plan). The emulator ignores it.
  - *Alternatives:* CI applies it on every deploy, which needs `storage.buckets.update` on `github-deploy` for a setting that practically never changes; or a scheduled function sweeps old sources, which is another new trigger type with its own hand deploy.

### U7. Owner-only sign-in

- `beforeUserCreated` (`apps/functions/src/owner/before-user-created.ts`) allows only a Google account with a verified email equal, ignoring case, to the `OWNER_EMAIL` parameter. It returns `customClaims: { owner: true }` and throws `permission-denied` for everyone else. The claim is in the owner's first ID token, so no refresh step is needed.
- `OWNER_EMAIL` is a `defineString` parameter. The emulator reads it from `apps/functions/.env.demo-tigy` (a placeholder `owner@tigy.test`, copied into `dist/apps/functions` by the build). For the real project, the `functions:deploy` target writes `dist/apps/functions/.env.tigy-165cc` from the `OWNER_EMAIL` environment variable and stops if it is unset. CI sets it from the GitHub repository variable `OWNER_EMAIL`.
- *Alternative:* a Secret Manager secret. It keeps the value hidden even from the console, but the deployer then needs to manage secret IAM. An email address isn't a credential, so keeping it out of the repository is enough.
- The admin signs in with `signInWithPopup` and a `GoogleAuthProvider`. A popup avoids the redirect flow's third-party storage problems while the admin lives on `web.app` and the auth domain on `firebaseapp.com`. A blocking-function error comes back as an `auth/` error, and the sign-in page shows "Only the owner can sign in." Closing the popup shows nothing.
- `ownerGuard` is a functional `canMatch` guard on every route but `/sign-in`. It waits for `authStateReady()`, then requires `owner === true` in the ID token's claims. Otherwise it redirects to `/sign-in?next=<url>`, and a signed-in account without the claim is signed out first. Sign-in reads `next` as an input (`withComponentInputBinding()`) and accepts only an admin path.
- Firebase Auth keeps the session in IndexedDB (its default `browserLocalPersistence`). Signing out goes back to `/sign-in` with `replaceUrl`.

### U8. The admin app

- **Tailwind v4 in the admin only:** `tailwindcss`, `@tailwindcss/postcss` and `postcss`, with `apps/admin/.postcssrc.json` and `@import "tailwindcss"` in `apps/admin/src/styles.css`. Angular reads the PostCSS configuration from the project's root, and `apps/public` has none, so the public build stays unchanged. A task checks that.
- **spartan-ng:** `@spartan-ng/brain` 1.8 supports Angular 21 and 22 and Tailwind 4, and brings its peers `@angular/cdk`, `clsx` and `tw-animate-css`. `@spartan-ng/cli:init` sets up the theme in the admin's stylesheet. The helm components live in one library, `libs/admin-ui`, as secondary entry points under spartan's default alias `@spartan-ng/helm/*` (`components.json`: `componentsPath: libs/admin-ui`, `generateAs: entrypoint`), and the stylesheet adds `@source` for that library. Components for this change: button, card, progress, table, badge, sonner, dropdown-menu, avatar, empty, spinner, tooltip and alert-dialog. Icons come from `@ng-icons/lucide`, which the public site already uses.
  - *Why spartan-ng:* the component code is copied into the repository, so it can be read and changed. It is built on the Angular CDK and fits the signals-first rules. *Alternatives:* Optimus UI (a PrimeNG fork: more components, including an upload widget that expects to post to a URL, but module- and event-style APIs); Angular Material (no Tailwind, but a fixed look).
- **Theme:** spartan's neutral palette, with Tigy's fur orange as `--primary` and the light or dark theme following the device. There is no theme switch.
- **Folders** (`.claude/rules/angular.md`):
  ```
  apps/admin/src/app/
    firebase/    firebase.ts (app, auth, emulator wiring), environment files
    auth/        auth.service.ts, owner.guard.ts
    chrome/      top bar, account menu
    sign-in/     sign-in page
    uploads/     uploads page (lazy), upload.service.ts, uploads.service.ts,
                 drop-zone/, upload-row/
  ```
- **Firebase in the browser:** the modular JS SDK through `@Service()` services, with no AngularFire. `AuthService` exposes the user and `isOwner` as signals. `UploadsService.list()` returns a `resource({ stream })` fed by `onSnapshot` (newest first, latest 100). `UploadService` runs up to three uploads at a time and keeps each one's progress in a signal. Firestore and Storage are imported only from the lazy Uploads route, so the first load carries just Auth, to stay under the 500 kB budget.
- **Checking a file before upload:** the admin reads the file's first 12 bytes (`file.slice(0, 12)`) and passes them to `detectImageFormat`. A file that is not JPEG, PNG, GIF or WebP, or is over 50 MB, is refused with its reason and never uploaded. The name and the browser's `file.type` are ignored: browsers set the type from the extension, so it is empty or wrong for a file with a missing or mistaken one.
- **Leaving during an upload:** while any file is uploading, `UploadService` asks the browser to confirm leaving the page, with a `beforeunload` listener that an `effect()` on the active count adds and removes. Moving between admin pages doesn't stop uploads, since the service is a singleton.
- **Thumbnails in the list** come from `getDownloadURL()` on `images/{id}/thumb.webp`, which works because processing gives each file a download token (U3). The admin doesn't depend on the public site running.
- **Shared upload logic** lives in `libs/uploads` (tag `shared`), used by the admin and `processUpload`: `detectImageFormat(bytes)` (format from the signature, or `undefined`), the format table (format → extension and MIME type) and `MAX_UPLOAD_BYTES`. The Storage rule repeats the 50 MB, since rules cannot import code. `libs/models` keeps only the stored shapes: `Upload`, `UploadStatus`, `UploadError`, `UPLOADS_COLLECTION` and `uploadPaths`.
- **Emulators:** the development build replaces the environment file with the `demo-tigy` configuration and connects Auth, Firestore and Storage to the local emulators. The production build carries the project's web configuration (public identifiers, not secrets).

### U9. Tests

- **Stripper:** unit tests on fixtures generated in the test with sharp: JPEG with GPS, camera data, XMP and a P3 profile, a rotated JPEG, PNG with text and `eXIf`, an APNG, still and animated WebP, an animated GIF with a comment. Each test checks that the pixels and frames are identical (sharp raw output, and `upng-js` for APNG frames), that the ICC profile is byte-identical, that no EXIF, XMP or IPTC remains apart from the orientation, and that stripping twice changes nothing. `upng-js` becomes a dev dependency. A cut-off file fails as damaged.
- **Processing:** against the Storage and Firestore emulators, calling the handler with a finalize event. Cases: a sticker, a tall comic, an animated GIF, a rotated JPEG, an opaque PNG with alpha, a wrong extension, an unsupported file, a damaged file, an oversized header, a repeated event, a source that no longer exists, and the cleanup trigger. Each ready case checks the download token on all three files, since the emulator may add tokens the real bucket would not. A test checks that loading `main.ts` does not load sharp.
- **Shared upload logic:** unit tests in `libs/uploads` for each format's signature, a too-short or unknown file, and a PNG renamed `.jpg`.
- **Blocking function:** the decision (allowed, or refused and why) as a pure function, tested with the owner's email in other case, another email, an unverified email and another provider.
- **Rules:** `firebase/tests` for both new paths and for the removed owner write under `images/`.
- **Admin:** unit tests for the guard, the sign-in error message, the upload checks (format from the bytes, size), merging in-memory rows with records, the "took too long" status, and the leave warning being on only while files upload. End-to-end tests of the admin come with `add-admin-editing`, when it has more flows to protect.
- **By hand:** the whole flow in the emulators, then in the real project after deploy with the five real pieces, recorded in tasks.md like the earlier changes' live checks.

## Risks / Trade-offs

- [sharp's native binary in the functions bundle] → esbuild leaves `sharp` external and the generated `package.json` lists it, so Cloud Build installs the Linux build. The first hand deploy checks it.
- [A huge animated GIF takes longer than the timeout] → the pixel limit counts every frame; the 540-second maximum and the "took too long" status cover what's left; the owner can resize the file and upload again.
- [APNG web versions are still] → APNG is rare among artist exports. The original keeps the animation, and animated web versions can come later through `upng-js` frames.
- [The trigger runs for every object written to the bucket] → it returns at once for other paths. That's three or four extra short runs per upload.
- [Three uploads at a time, and the trigger's own writes, share two instances] → an event refused while both are busy is retried with backoff (U3), so a larger batch finishes a few minutes later. A source whose event is never processed is deleted by the lifecycle rule after a day (U6).
- [The emulator may give files download tokens on its own] → the processing tests check the token explicitly, and the live check confirms thumbnails in the real admin.
- [A mistyped `OWNER_EMAIL` locks the owner out] → refused sign-ins are logged by the blocking function. Fix the variable and redeploy the functions.
- [The admin's first bundle passes the 500 kB warning] → Firestore and Storage load only with the Uploads route. If Auth and spartan still cross the warning, raise it and keep the 1 MB error.
- [The owner clears a row while it is still processing] → the admin offers clearing only for ready, failed and "took too long" rows. The cleanup trigger never touches files of an existing image.
- [New uploads stay unpublished until `add-admin-editing`] → the owner can publish in the Firebase console in the meantime. The image trigger keeps the summaries right either way.

## Migration Plan

1. **Owner, in the console:** upgrade Authentication to Identity Platform and enable the Google provider. Set the GitHub repository variable `OWNER_EMAIL`. If an account already exists in Authentication, delete it, so the owner's account is created through the blocking function.
2. **Deploy by hand once:** `firebase:deploy` (rules), then `functions:deploy` with `OWNER_EMAIL` set. The first blocking function and the first Storage trigger grant roles to Google's service agents, which only the owner may do (README). Grant `github-deploy` whatever the CI deploy of a blocking function then asks for, and add it to the README's role table.
3. **Lifecycle rule, once:** `gcloud storage buckets update gs://tigy-165cc.appspot.com --lifecycle-file=firebase/storage-lifecycle.json` (U6), recorded in the README with the other one-time steps.
4. **Push:** CI deploys the admin. Sign in, and run the live checks.

Rollback: redeploy the previous rules and functions, then the previous admin. Without the blocking function, new accounts could be created again but get no claim, so the rules still refuse them everything. Uploaded artworks are ordinary unpublished images and can stay, and so can the lifecycle rule.

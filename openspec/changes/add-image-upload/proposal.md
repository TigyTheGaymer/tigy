# Proposal

## Why

The public site is built and designed, but it only shows the emulator seed: there is no way to put real art on it. The admin (`apps/admin`) is an empty shell, and nothing turns an uploaded file into the original, full image and thumbnail the site reads (`define-data-model` fixed their names and left making them to this change). This change lets the owner sign in and upload pieces, and builds the one backend pipeline that makes every public file.

## What Changes

- **Admin shell.** `apps/admin` gets a layout with a top bar, the signed-in account and sign out, built with spartan-ng components on Tailwind CSS v4. Tailwind is set up for the admin only; the public site keeps its hand-written styles.
- **Owner-only sign-in.** The admin signs in with Google. A sign-up blocking function refuses every account except the owner's email (a Cloud Functions parameter, not in the repository) and gives the owner's account the `owner: true` claim that the rules already check (`define-data-model` D8). Every admin page is behind a guard that requires that claim.
- **Upload with progress.** The owner drops or picks one or more JPEG, PNG, GIF or WebP files, each up to 50 MB. The admin checks the format from the file's first bytes and the size first, then uploads each file straight to Storage with a progress bar, and asks before the owner leaves the page while files are still uploading.
- **Processing function.** A Storage trigger turns each upload into a new artwork:
  - the original with its metadata removed and every pixel unchanged (spike S5);
  - the full image and the thumbnail as WebP, animated for animated pieces;
  - the file details (format, size, dimensions, animated, transparent);
  - an unpublished artwork with no title, credits or tags, sorted by the day it was added.

  The uploaded file is then deleted. An upload that is never processed is deleted by a bucket lifecycle rule after a day.

- **Upload list.** An Uploads page lists the uploads newest first, with live status: uploading (with progress), processing, ready (with its thumbnail and file details) or failed (with a reason the owner can act on). The owner can clear finished rows; clearing never deletes the artwork.
- **Rules.** Only the owner may create an upload, and only of an allowed type and size. Browsers may no longer write under `images/`: its files come from the pipeline only. Upload records are written only by functions.

Out of scope, for `add-admin-editing` next: editing a piece's details, credits, tags and NSFW flag; publishing and deleting; managing people and avatars; the admin counts. Until then a new upload stays unpublished, and the owner can only edit it in the Firebase console. Also out of scope: finding duplicate uploads, replacing a piece's file, animated web versions of APNG files (they get still ones), and end-to-end tests of the admin.

## Capabilities

### New Capabilities

- `admin-access`: who can sign in to the admin, how others are refused, and signing out.
- `image-upload`: uploading files from the admin, the formats and limits, what processing makes from an upload, the upload list and its statuses, and that public files come only from processing.

### Modified Capabilities

None. The artwork that processing creates follows `gallery-catalog` as it stands: it is unpublished, so no public list, count or page shows it.

## Impact

- **Code:** `apps/admin` (shell, sign-in, guard, Uploads page, Firebase client setup, Tailwind and spartan-ng setup); new spartan-ng helm components in their own library under `libs/`; `apps/functions` (sign-up blocking function, processing trigger, the metadata stripper moved in from the S5 spike, and its tests); `libs/models` (upload record and paths); a new `libs/uploads` (format detection and the size limit, shared by the admin and the functions); `firebase/` (Storage and Firestore rules with their tests, and the bucket lifecycle rule).
- **Dependencies:** `tailwindcss`, `@tailwindcss/postcss`, `@spartan-ng/brain` and `@spartan-ng/cli` with their peers `@angular/cdk`, `clsx` and `tw-animate-css`; `sharp` (already in the workspace for the seed) becomes a functions dependency.
- **Firebase:** the owner upgrades Authentication to Identity Platform (needed for blocking functions) and enables Google sign-in. The blocking function and the Storage trigger are new kinds of trigger, so each is deployed by hand once before CI takes over. CI writes the `OWNER_EMAIL` parameter from a GitHub repository secret. The owner applies the lifecycle rule for `uploads/` once with `gcloud`, since the Firebase CLI cannot deploy it.
- **Other changes:** builds on the archived `define-data-model` (file names, image fields, owner claim) and is followed by `add-admin-editing`.

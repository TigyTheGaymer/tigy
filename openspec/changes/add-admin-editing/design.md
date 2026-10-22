# Design

## Context

See proposal.md for why this change exists. What is already in place:

- **The data model** (`define-data-model`): `images/{id}` and `people/{id}` are the only documents the admin edits. `meta/gallery`, `meta/people` and `meta/tags` are derived by `onImageWritten` and `onPersonWritten`, each in one transaction on a single summary document. `sortDate` is stored on the image and must follow `date` (`sortDateFor()` in `@tigy/gallery`). Tags are normalised by `normaliseTag()`/`normaliseTags()`. `deletePerson` (refuses while credited, names the crediting images, refuses Tigy) and `rebuildSummaries` are owner-only callables that nothing calls yet.
- **The admin** (`add-image-upload`): a spartan-ng shell on Tailwind v4 with a top bar and account menu, `ownerGuard` on every route but `/sign-in`, and a lazy Uploads page. Firestore and Storage are injected through `FIRESTORE` and `STORAGE` tokens imported only by lazy routes, so the first load carries just Auth. The Uploads page puts its Firebase calls behind an `UPLOADS_API` token so tests can replace them.
- **Rules:** the owner may read everything, create and update `people`, and create, update and delete `images` with no field checks. Storage lets the owner write `people/{id}/avatar.webp` with no size or type check, and lets anyone `get` files under `images/`.
- **Uploads:** `UploadService` (checks, uploads three at a time, the leave warning) and `UploadsService` (live records merged with in-memory rows) are singletons in `app/uploads/`, used only by the Uploads page so far.
- **The public site** serves avatars at `/avatars/{id}.webp` from `people/{id}/avatar.webp`, and images under `/img/`, with a 10-minute shared cache and a day in browsers. It shows a social link's logo from its network name (`brandFor()` in `apps/public/src/app/social/brands.ts`: Bluesky, Telegram, Twitter/X, Fur Affinity), and any other network with a generic icon.
- **Scale:** a few hundred artworks and a few dozen people, growing by tens a year; one owner, sometimes in two tabs.
- **Tests:** `apps/public-e2e` runs Playwright under `firebase emulators:exec` with the seed. The admin has unit and component tests only.

## Goals / Non-Goals

**Goals:**

- The owner can take a fresh upload to a published, credited, tagged piece without leaving the admin, and work through a batch of uploads quickly.
- The browser can write only what the editors edit. Everything derived stays with the functions.
- The admin keeps its small first load: new pages are lazy, and Firestore and Storage still load only with them.
- Designed for a desktop, and usable on a phone for uploading and quick edits (E15).

**Non-Goals:**

- Offline editing, or merging edits made at the same time in two tabs: the last save wins, field by field (E4).
- Undo after saving, and a history of changes.
- A hand-made design: the editors use spartan-ng components like the Uploads page.

## Decisions

### E1. Routes and navigation

```
/sign-in
/artworks                ?view=unpublished|sfw|nsfw|needs-work&q=…      landing page
/artworks/:id            ?view=…&q=…   artwork editor, with the list it was opened from (E13)
/people                  ?q=…
/people/:id              person editor
/uploads
**                       → /artworks
```

All are lazy and behind `ownerGuard`. The top bar gains links to Artworks, People and Uploads. `view` and `q` are component inputs bound from the query (`withComponentInputBinding()`), and the page updates the address with `replaceUrl`, so typing a search doesn't fill the history. Sign-in's default `next` becomes `/artworks`.

### E2. One live list of artworks, shared by the pages

`ArtworksService` (`@Service()`) holds one `resource({ stream })` fed by `onSnapshot` on the whole `images` collection, started on first use and kept while the admin is open. The Artworks page, the counts, the People page's credit counts and the editor's "not found" check all read it.

- Order: `sortDate` descending, then ID descending, the same total order as the public gallery (`compareText`).
- View, search and counts are `computed()` over the list in memory. The search matches `title` after `toLowerCase()`.
- **Needs work** is a view like the others: `missing(image)` returns which of artist, title and date are absent (characters and tags never count), the view keeps the artworks where it is non-empty, and the tile shows it ("No artist · No date"). Its count shows on its tab. Nothing is stored, so a piece leaves the view as soon as a save fills its gaps.
- _Why:_ a few hundred small documents cost one read each when the admin opens, then only the changes. Counts, filters and search need no indexes and no extra queries, and stay live.
- _Alternative:_ paged queries with `count()` aggregations for the counts. Scales further, but every view × sort needs a composite index, counts need three extra queries per change, and the People page couldn't count credits without its own queries. Revisit past a few thousand artworks.

`PeopleService` does the same for `people`, sorted with Tigy first and then by name with `localeCompare` (an admin-only order, unlike the public site's). Tigy is edited like anyone else, name included; only deleting is left out, matching `deletePerson`'s refusal. Tag suggestions read `meta/tags` once per editor visit (owner-only, already allowed) and sort by count, then by name.

### E3. Files are shown from Storage without download tokens

Thumbnails, full images, originals and avatars are loaded with the Storage REST address `https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{encoded path}?alt=media` (the emulator's host and port in development), built from the ID alone by `storageUrl(path)` in `app/firebase/`.

- _Why:_ the rules already allow anyone to `get` these files, and a request without a token is checked against the rules. Calling `getDownloadURL()` for each of several hundred tiles would cost a metadata request per tile before any image loads.
- The Uploads page switches to the same helper, so `UPLOADS_API.thumbnailUrl` goes away. Processing keeps adding download tokens; nothing depends on them any more.
- _Alternative:_ the public site's `/img/` addresses. They would tie the admin to the public site running, which `add-image-upload` U8 avoided, and to its 10-minute cache.

### E4. The editors: Signal Forms, one save

Both editors build a form model from the stored document with `form()` from `@angular/forms/signals`, bind inputs with `[formField]`, and save with `submit()`.

- **Artwork model:** `title`, `description`, `date` as `{ year, month, day }` strings, `published`, `nsfw`, `artistIds`, `characterIds`, `tags`. The schema requires a four-digit year when month or day is set, a month when day is set, and a date that `parseArtworkDate()` accepts.
- **Saving writes only what changed.** The save compares the model with the document it was loaded from and calls `updateDoc()` with just the changed fields, plus `sortDate` when `date` changed (`sortDateFor(date, createdAt)`) and `updatedAt: serverTimestamp()`. A cleared field becomes `deleteField()`. Text is trimmed, tags go through `normaliseTags()`. So a save in one tab never reverts a field another tab or a bulk action changed, unless this editor changed it too.
- **Unsaved edits:** the form's `dirty()` state, reset after a successful save. A `canDeactivate` guard asks through an alert dialog when leaving a dirty editor inside the admin, and a `beforeunload` listener, added and removed by an `effect()` on `dirty()`, covers closing the page. This reuses the Uploads page's pattern.
- **After save** a toast (sonner) confirms; a failed save shows a toast with the reason and keeps the form as it was.
- The editor loads the document from the live list (E2), so a deleted artwork shows "not found" at once. The form is built once per artwork ID and is not rebuilt by later snapshots, so the owner's typing is never overwritten.
- _Alternative:_ reactive forms (`FormGroup`). Works, but the project's rules ask for signals first, and Signal Forms are available in Angular 22.

### E5. Credit and tag pickers

- **Credits:** a combobox over `PeopleService`'s list, matching names that contain the typed text, ignoring case and accents (`normalize('NFD')` without combining marks). People already in that list are left out. When no name matches exactly, the last option is "Create ‹name›": it creates `people/{newId}` with `addDoc` (name, empty links, timestamps) at once, outside the editor's save, and adds the ID to the list. Credits show the person's avatar and name, with up and down buttons and a remove button; keyboard-accessible buttons instead of drag and drop.
  - _Why create at once:_ the person must exist for the credit to resolve, and an orphan person costs nothing: the owner can delete an uncredited person.
- **Tags:** a text input with suggestions from `meta/tags` that contain the typed text; Enter or a comma adds the normalised tag unless it is already there. Each tag is a chip with a remove button.

### E6. Bulk actions

The Artworks page has a checkbox per entry and a select-all for the current view. With a selection, a bar offers Publish, Unpublish, Mark NSFW, Unmark NSFW and Delete.

- One `writeBatch` per action (at most 500 writes; the selection is capped at 500), so it either all applies or none does. Updates set only `published` or `nsfw` and `updatedAt`.
- Publish asks first when some selected artworks credit no artist (E14). Delete asks first with the count. The image trigger deletes each artwork's files and upload record (E8).
- Each written image fires `onImageWritten`, and those triggers contend on `meta/gallery`. The Admin SDK's transactions retry on contention, and this change turns on `retry: true` for the trigger (E8), so a run that still fails is delivered again. Publishing and NSFW changes leave tags alone, so a repeated run cannot miscount them.

### E7. Avatars

- The owner picks a file; the admin checks it with `detectImageFormat` and the 50 MB limit from `@tigy/uploads`, like uploads.
- The cropper decodes the file with `createImageBitmap(file, { imageOrientation: 'from-image' })` (first frame for animations), shows it under a fixed square frame, and lets the owner drag (pointer events) and zoom (a slider, the wheel, or a pinch, E15) between "the square fits the shorter side" and 8× that. It starts on the largest centred square.
- On save it draws the chosen square into an `OffscreenCanvas` of `min(512, square side)` pixels and encodes `image/webp` at quality 0.9. Drawing to a canvas carries no metadata over.
- It uploads to `people/{id}/avatar.webp` with `uploadBytes` and content type `image/webp`, then sets `avatar` on the person in the same save as the other fields. Removing deletes the file and the field. The avatar is saved with the editor's Save, not on its own.
- **Rules:** the avatar write now requires `image/webp` and at most 1 MB, and allows the owner to delete it.
- _Alternative:_ upload the picked file and let a function crop it. It would need the crop sent alongside, a new trigger, and a wait for processing, for a 512-pixel image the browser can make.

### E8. Functions

- `onImageWritten`: `retry: true`. On delete it also deletes `uploads/{id}` when it exists, which fires the existing `onUploadDeleted` cleanup; that finds no image and removes whatever is left under `uploads/{id}/` and `images/{id}/`.
- `onPersonWritten`: `retry: true`. On delete it removes `people/{id}/avatar.webp` if present.
- _Why retries are safe:_ `syncImage` and `syncPerson` re-read inside their transactions and replace whole rows. The tag counts move by a difference, which a retry would apply twice only if a run committed and then failed before returning; the only step after the commit is the size warning, and the files and upload deletion, which are idempotent. The function is wrapped so those later steps cannot fail the event.
- **Rebuild summaries:** the account menu gains "Rebuild summaries", which calls `rebuildSummaries` through `httpsCallable` and shows the result in a toast. It is the recovery path from `define-data-model` D4, for a summary that still drifted.

### E9. Rules

```
images/{imageId}
  create: nobody
  update: owner, and
    request.resource.data.diff(resource.data).affectedKeys()
      .hasOnly(['title','description','date','sortDate','published','nsfw',
                'artistIds','characterIds','tags','updatedAt'])
    and each present field has its type: strings for title, description,
    date ('^[0-9]{4}(-[0-9]{2}){0,2}$') and sortDate ('^[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
    bools, lists for credits and tags (size <= 50), updatedAt == request.time
  delete: owner

people/{personId}
  create: owner, keys hasOnly(['name','links','avatar','createdAt','updatedAt']),
          name a non-empty string, links a list (size <= 20),
          avatar absent or == 'people/' + personId + '/avatar.webp'
  update: owner, the same checks, createdAt unchanged
  delete: nobody (deletePerson)
```

- The rules check types and which fields change, not meaning: they can't check that `sortDate` follows `date` or that tags are normalised. The admin does that with the shared helpers, and the summaries trust the stored values as they did before.
- _Why forbid creating images:_ processing is the only path to an artwork with files (`image-upload`). A browser-created image would have no files and no `file` details.

### E10. Components and folders

New spartan-ng helm components in `libs/admin-ui`: input, textarea, label, field, switch, checkbox, combobox (or autocomplete), select, table, tabs, dialog, sheet, kbd, separator, skeleton, slider and toggle-group, added with `@spartan-ng/cli`. Icons from `@ng-icons/lucide`.

```
apps/admin/src/app/
  artworks/       artworks page (list, view tabs, search, counts, bulk bar),
                  artworks.service.ts, artworks-api.ts
  artworks/editor/   artwork editor, date-fields/, credits-picker/, tags-input/
  people/         people page, people.service.ts, people-api.ts
  people/editor/  person editor (also shown in the credit sheet, E17), links-editor/, avatar-cropper/
  artworks/upload-tiles/   upload tiles and the page-wide drop target (E12)
  uploads/        unchanged place for upload.service.ts and uploads.service.ts,
                  now also used by artworks/
  firebase/       storage-url.ts (E3), functions.ts (callables)
  shared/         unsaved-edits.guard.ts, confirm dialog
```

Each `*-api.ts` is an `InjectionToken` over the Firestore and Storage calls, as `uploads-api.ts` is, so unit tests replace it.

### E11. End-to-end tests

A new `apps/admin-e2e` project, like `public-e2e`: `firebase emulators:exec --only auth,functions,firestore,storage --project demo-tigy` around `playwright test`, with `nx serve admin` (the development build, which talks to the emulators) as Playwright's web server, and `functions:build` as a dependency.

- **Sign-in:** the Auth emulator's popup offers "Add new account". The test fills the email and name and confirms; `owner@tigy.test` is the emulator's `OWNER_EMAIL`. A stranger's email checks the refusal.
- **Data:** each test starts from the seed (people and artworks) plus what it creates, and uploads use the files in `design/mockups/assets/`.
- **Flows:** sign-in, refusal, sign-out; an upload dropped on the Artworks page through to the editor, titled, dated, credited with a new person, tagged and published, then the counts; upload tiles on a view that hides the result; Save and next through unpublished pieces, then Ctrl+Enter and Alt+arrows through Needs work; adding links to a new artist in the side panel; filters and search with a reload; a bulk publish with an uncredited piece and a bulk delete; leaving with unsaved edits; a person with a pasted link and a cropped avatar; deleting a credited person (refused, with links) and an uncredited one.
- **Phone:** a second Playwright project with a phone viewport and touch runs the specs tagged `@phone`: uploading through the file picker on Artworks, editing and saving a piece, a bulk publish, and a pinch in the cropper.
- The tests check what the admin shows and the documents in the emulator (through the Admin SDK), not the public site, which `public-e2e` covers.
- **CI:** the project has an `e2e` target, so `nx affected -t … e2e` in both workflows runs it whenever the admin, the functions, the rules or a library they use changes, and a failure stops the deploy, as for `public-e2e`. Nothing in the workflows changes.

### E12. Uploading from the Artworks page

- The Artworks page reuses `UploadService` (the checks, three at a time, the leave warning) and `UploadsService`'s merged rows, so an upload started on either page shows on both and survives moving between pages, since both services are singletons.
- **Picking:** an Upload button opens a file input with `multiple` and `accept="image/jpeg,image/png,image/gif,image/webp"`, which a phone shows as its photo picker.
- **Dropping:** `dragenter`, `dragover` and `drop` listeners on the page show an overlay ("Drop to upload") while files are dragged over it. Only drags that carry files count, so dragging a tile or text does nothing.
- **Tiles:** the merged rows whose status is uploading, processing, failed or "took too long" show above the artworks, newest first, whatever the view and search. A ready row has no tile: its artwork is in the live list (E2) by then, so the tile is replaced by the artwork's own tile.
- **Hidden results:** when rows turn ready, the page checks whether their artworks match the current view and search. If any don't, one toast per burst (rows turning ready within two seconds) says "N artworks ready" with a link to `?view=unpublished`.
- **Failed tiles** come from the live records, so a failure from earlier or another tab shows too. Dismissing deletes the record, the same call as clearing on the Uploads page, which also cleans up leftover files.

### E13. Moving through the list in the editor

- The Artworks page links each tile to `/artworks/{id}` with its current `view` and `q`, and the editor reads them as inputs. A link without them (from an upload row, or pasted) means All.
- Previous and next come from `ArtworksService`'s list filtered the same way: the neighbours of the current ID. If the current artwork no longer matches (it was just published while on Unpublished), the neighbours are taken from where it sat in the list before that change.
- **Save and next** reads the next ID before saving, saves, and on success navigates there; a failed save stays. The unsaved-edits guard (E4) asks before previous or next with unsaved edits, as for any navigation.
- The editor's form is built per artwork ID (E4), so moving to the next piece starts a clean form.

### E14. The "No artist" hint

- `artistIds.length === 0` marks a tile and the editor with a muted "No artist" badge.
- Bulk Publish counts the selected artworks without artists; when any, an alert dialog asks "N of M have no artist credited. Publish anyway?" before the batch (E6). Nothing else is checked, and nothing is refused.

### E15. Phones

- Layouts use Tailwind's breakpoints, desktop first with a working phone layout: the tile grid reflows to two columns, the editor stacks the image above the form below `md`, the bulk bar is fixed to the bottom of the screen on small widths, and the top bar's links collapse into a menu.
- The cropper (E7) handles pointer events: one pointer pans, two pointers pinch to zoom around their midpoint, and `touch-action: none` on the frame keeps the page from scrolling under it.
- The leave warnings rely on `beforeunload`, which phones don't always show; the in-admin guard (E4) still covers navigation inside the admin.

### E16. The shared network list

- A new library `libs/social` (tag `shared`) takes `BRANDS` and `brandFor()` from `apps/public/src/app/social/brands.ts`, with their tests, and the public site imports it. Its rendered output stays the same.
- Each brand gains its profile address rules: the hosts it answers to and how to read the handle from the path.

  | Network      | Address                                          | Handle             |
  | ------------ | ------------------------------------------------ | ------------------ |
  | Bluesky      | `bsky.app/profile/{handle}`                      | `@{handle}`        |
  | Telegram     | `t.me/{name}`, `telegram.me/{name}`              | `@{name}`          |
  | Twitter      | `x.com/{name}`, `twitter.com/{name}` (any `www.`) | `@{name}`         |
  | Fur Affinity | `furaffinity.net/user/{name}` (any `www.`)       | `{name}`           |

- `profileFromUrl(url)` returns `{ network, handle }` with the brand's display name as the network, or `undefined` for any other address. The links editor calls it when an address is entered, and fills the network and the handle only where they are empty.
- `brandFor()` already accepts both the display name and the seed's keys (`bluesky`), so stored links need no migration.

### E17. Editing a credited person in a side panel

- The person editor is one component, `PersonEditor`, used by the `/people/:id` page and inside a spartan `sheet` opened from a credit's edit button (from the right on a desktop, from the bottom on a phone).
- It owns its own Signal Form and Save, so the artwork's form underneath is untouched: two forms, two saves. Saving the person closes the sheet; the credit's name and avatar update from `PeopleService`'s live list.
- Closing the sheet (its close button, Escape or a click outside) with a dirty person form asks first, through the same alert dialog as the leave guard (E4). The artwork's leave guard still covers the artwork's own edits.
- Deleting is not offered in the sheet: the person is credited right there, so `deletePerson` would refuse anyway.

### E18. Keyboard shortcuts

- One `keydown` listener on the editor page, bound through the component's `host: { '(document:keydown)': … }`, handles them:

  | Keys               | Action               |
  | ------------------ | -------------------- |
  | Ctrl+S, ⌘S         | Save                 |
  | Ctrl+Enter, ⌘Enter | Save and next        |
  | Alt+←, Alt+→       | Previous, next (E13) |

- Ctrl/⌘+S always calls `preventDefault()`, so the browser never offers to save the page, even when there is nothing to save. Alt+arrows are left alone when the focus is in a text input or textarea, where some systems use them to move through words. The others work from any field.
- While the person sheet (E17) is open, the shortcuts act on it: Ctrl/⌘+S saves the person, and the others do nothing.
- Each button's tooltip names its shortcut with the `kbd` component, showing ⌘ on a Mac.
- There are no shortcuts on the Artworks page.

## Risks / Trade-offs

- [The whole `images` collection loads with the admin] → a few hundred reads per visit, far inside the free tier; the snapshot keeps later reads to the changes. Past a few thousand pieces, switch to paged queries (E2, alternative).
- [Rendering a few hundred tiles at once] → `loading="lazy"` thumbnails at 720 px or less; if the list becomes slow, render in pages as it scrolls. The CDK virtual scroller is a fallback, though it fights variable tile heights.
- [Storage REST addresses without tokens] → they work only because the rules allow public `get`. A task checks them against the emulator and the real bucket; if the real bucket refuses, fall back to `getDownloadURL()` for the visible tiles only.
- [Bulk triggers contend on `meta/gallery`] → transactions retry and the trigger retries (E8); "Rebuild summaries" repairs anything left. Selections are capped at 500.
- [A retried image trigger counts a tag difference twice] → only if a run commits and then fails before returning; the later steps are wrapped so they cannot fail it, and the rebuild corrects the counts.
- [Two tabs edit the same field] → the last save wins for that field; other fields keep the newer value (E4).
- [A replaced avatar stays in visitors' browsers for up to a day] → the public site caches avatars for a day in browsers. Accepted: avatars rarely change. Versioned avatar addresses can come later.
- [People created from a picker and then not used] → they show on the People page with no credits and can be deleted.
- [The Auth emulator's popup changes between `firebase-tools` versions] → the sign-in steps live in one Playwright helper.
- [The admin's end-to-end tests make deploys slower] → they run only when something the admin depends on changes (E11). If they grow slow, the phone project can move to the checks workflow only.
- [A phone hands over a HEIC photo] → iPhones usually convert to JPEG for a file input that accepts only JPEG, PNG, GIF and WebP. If a HEIC still arrives, it is refused before upload with the existing message, as on a desktop.
- [The page-wide drop target catches a drop meant for a text field] → only drags carrying files count; a file dropped on a text field is still taken as an upload, which is what the owner meant by dropping a picture.
- [Previous and next after the list changed under the editor] → the neighbours come from the live list; when the current piece left the view, from its place before the change (E13).
- [An unpublished piece's files stay reachable by ID] → unchanged from `define-data-model` D8.

## Migration Plan

1. Deploy the rules and functions (CI on push). No data migration: existing images already have every field the rules allow, and `people/tigy` has `name`, `links` and `avatar`.
2. CI deploys the admin.
3. Live check: sign in, edit and publish the five real pieces, create the real artists and characters with links and avatars, set Tigy's links and avatar, and check the public site.

Rollback: redeploy the previous rules, functions and admin. Edits already made are ordinary field values and stay.

# Tasks

Run tasks through Nx (`npx nx ...`). Functions tests run against the emulators as they already do.

## 1. Tigy on new uploads

- [x] 1.1 In `apps/functions/src/uploads/process-upload.ts`, create the image with `characterIds: [TIGY_ID]` (design 1); update `process-upload.spec.ts` so the processed image credits only Tigy and no artists; verify with `npx nx test functions` (covers "Tigy is credited on a new upload")
- [x] 1.2 Update the admin e2e flows that take a fresh upload through the editor (`apps/admin-e2e/src/editor.spec.ts`, `artworks.spec.ts`) wherever they assume no characters: expect Tigy in the characters picker, and remove Tigy in one flow, then check the stored image has `characterIds: []` after saving; verify with `npx nx e2e admin-e2e` (covers "Removing the default credit")

## 2. The `creditTigy` callable

- [x] 2.1 Add `apps/functions/src/people/credit-tigy.ts` with the pure `creditTigyFirst(characterIds)`: Tigy prepended when missing, `undefined` when Tigy is already credited anywhere or the list already holds 50 (design 2, 3); verify with unit tests for an empty list, `['bramble', 'kitsu']` becoming `['tigy', 'bramble', 'kitsu']`, Tigy already first, Tigy in second place left alone, and 50 characters
- [x] 2.2 In the same file, add `creditTigy()`: read `images`, keep the IDs lacking Tigy, then one transaction per chunk of at most 500 that re-reads with `getAll`, applies `creditTigyFirst()` and updates only `characterIds` and `updatedAt`, returning `{ changed }`; wrap it in `creditTigyCallable` with `requireOwner()` and export it as `creditTigy` from `main.ts` beside the other owner tools (design 2); verify with emulator tests in `credit-tigy.spec.ts` for "Crediting the existing catalog" (published and unpublished, count 3), "Other characters keep their order", other fields and `createdAt` unchanged, "Running it again" (count 0) and "Not the owner" (`NOT_OWNER` and no auth refused with `permission-denied`), and with `main.spec.ts` passing with the new export
- [x] 2.3 Verify the gallery follows: an emulator test that runs `creditTigy()`, then `syncImage()` for a changed image, and finds `tigy` in that row of `meta/gallery` (covers "Gallery filter follows")

## 3. Admin menu item

- [x] 3.1 Add `creditTigy(): Promise<{ changed: number }>` to `Callables` in `apps/admin/src/app/firebase/functions.ts`, calling `creditTigy`; verify with `npx nx run-many -t lint build -p admin`
- [x] 3.2 Add "Credit Tigy on every artwork" to the Site tools menu in `chrome/top-bar.html` after "Rebuild summaries", with the hint "Adds Tigy as a character where it's missing.", an `isCreditingTigy` signal that disables it while it runs, the success toast "Tigy credited" / "Added to N artworks." (singular for 1, "Nothing to change" / "Every artwork already credits Tigy." for 0) and the error toast "Tigy couldn't be credited. Try again." (design 4); verify with component tests in `top-bar.spec.ts` with a faked callable for the item being present, success with 3 and with 1, disabled while running, and failure

## 4. Integration

- [ ] 4.1 Run `npx nx run-many -t lint test build -p functions admin` and `npx nx e2e admin-e2e`, and confirm everything passes
- [x] 4.2 In the emulators, upload a picture and check its artwork credits Tigy; then add an artwork without Tigy, run the menu item, and check the toast says 1 and that the public home gallery filtered by Tigy shows the published one

## Workflow follow-up

- After deploying functions and the admin, run "Credit Tigy on every artwork" once in the production admin, then check the public Tigy filter (design Migration Plan).
- Archive the change once it's deployed and verified.

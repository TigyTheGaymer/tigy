# Design

## Context

- `processUploadedObject()` in `apps/functions/src/uploads/process-upload.ts` creates `images/{id}` with `characterIds: []`. `TIGY_ID = 'tigy'` lives in `@tigy/models`, and `Image.characterIds` is documented as "Tigy first".
- Owner tools are callables guarded by `requireOwner()` (`rebuildSummaries`, `deletePerson`). The admin reaches them through the `CALLABLES` token in `apps/admin/src/app/firebase/functions.ts`, and the top bar's "Site tools" menu runs `rebuildSummaries` with a busy flag and toasts.
- Every write to `images/{id}` fires `onImageWritten`, which rewrites that image's row in `meta/gallery` in a transaction. Character filters on the public site read that row.
- The artwork editor saves only changed fields with `updateDoc()`, so a backfill that touches only `characterIds` and `updatedAt` won't conflict with the editor's other fields.

## Goals / Non-Goals

**Goals:**
- New uploads start with Tigy credited, with no change to the editor or the data model.
- The backfill can be rerun safely, and it can't overwrite a credit edit the owner makes while it runs.

**Non-Goals:**
- Forcing Tigy onto artworks, or moving Tigy to the front when an artwork already credits Tigy further down. The owner's order wins.
- Adding Tigy as an artist.
- Removing the menu item after the first run. It stays as a harmless tool.

## Decisions

**1. The default is set in processing, not in the editor.** `processUploadedObject()` writes `characterIds: [TIGY_ID]`. The artwork is born with the credit, so it already appears in Tigy's filter once published, even if the owner never opens the editor. *Alternative:* prefill the editor's form for artworks with no characters. That would also re-add Tigy after the owner deliberately cleared the credit, which the spec forbids.

**2. A new `creditTigy` callable in `apps/functions/src/people/credit-tigy.ts`.** It sits beside `delete-person.ts` because it's a person-credit tool, and `main.ts` exports it with the other owner tools. It returns `{ changed: number }`.
- It reads `characterIds` of all `images` once (a `select` projection), then keeps the IDs whose `characterIds` lack `TIGY_ID`. The catalog is small, and `rebuildSummaries` already reads the whole collection the same way.
- It updates those IDs in chunks of at most 500 (Firestore's transaction write limit), one `runTransaction` per chunk. Each transaction re-reads its images with `getAll`, skips any that now credit Tigy, and updates the rest with `characterIds: [TIGY_ID, ...current]` and `updatedAt: FieldValue.serverTimestamp()`. Re-reading inside the transaction means a credit edit saved during the run is either kept or makes the transaction retry, never lost. *Alternative:* `FieldValue.arrayUnion(TIGY_ID)` with a batch, which needs no reads, but it appends Tigy last, against the documented "Tigy first" order.
- `changed` counts the updates that were actually written, so a rerun reports 0.
- `updatedAt` moves forward because the artwork really changed, matching what the editor and bulk actions do.

**3. A pure helper for the new list.** `creditTigyFirst(characterIds): string[] | undefined` returns the new list, or `undefined` when Tigy is already credited. It lives in the callable's file and gets its own unit tests, so the ordering rules can be tested without the emulator.

**4. Admin wiring follows `rebuildSummaries`.** `Callables` gains `creditTigy(): Promise<{ changed: number }>`. The top bar's "Site tools" menu gets a second item after "Rebuild summaries": "Credit Tigy on every artwork", with the hint "Adds Tigy as a character where it's missing.", its own `isCreditingTigy` signal to disable it while it runs, a success toast ("Tigy credited", "Added to N artworks.", with "artwork" in the singular for 1, or "Nothing to change", "Every artwork already credits Tigy." when it changed none), and an error toast on failure. It runs without asking first, because it only adds a credit the owner can remove, and running it twice does nothing.

## Risks / Trade-offs

- [Every changed image fires `onImageWritten`, and each event runs a transaction on the single `meta/gallery` document, so N changes mean N contended transactions.] → The catalog is small, and the triggers already retry. If the gallery ever drifts, "Rebuild summaries" fixes it.
- [An artwork that already credits 50 characters would exceed the rules' 50-item limit, so the editor couldn't save it afterwards.] → No artwork comes close. The callable skips any artwork with 50 or more characters and leaves it out of the count.
- [The callable runs without a confirmation, so a stray click changes the catalog.] → The change only adds a credit, can be undone per artwork in the editor, and is what the owner wants for every piece anyway.

## Migration Plan

1. Deploy functions (`processUpload` and the new `creditTigy`), then the admin.
2. In the production admin, open Site tools and run "Credit Tigy on every artwork" once. Check that the toast count matches the artworks that lacked Tigy, and that the public gallery filtered by Tigy shows them within 10 minutes.
3. Rollback: redeploying the old `processUpload` restores empty credits for new uploads. The backfilled credits stay, and the owner can remove them per artwork.

# Design

## Context

The leave question comes from `unsavedEditsGuard` (`apps/admin/src/app/shared/unsaved-edits.guard.ts`), the `canDeactivate` guard on `/artworks/:id` and `/people/:id`. It calls `ConfirmService.ask(LEAVE_QUESTION)`, which opens `ConfirmDialog` as an alert dialog with two buttons (Cancel, then Confirm) and resolves `true` only for Confirm; Escape or any other close is `false`. The guard sees the page only through `HasUnsavedEdits.hasUnsavedEdits()`.

`ArtworkEditorPage.save()` is already public and resolves `true` when nothing is left unsaved. It already handles every way a save can stop: it shows the date error, asks "Publish with missing details?" when publishing a piece with gaps, and shows a toast when the write fails, keeping the edits in each case. Save and next uses it the same way.

The `artwork-editing` capability lives in the open `add-admin-editing` change (design E4, E13 there), not yet in `openspec/specs/`.

## Goals / Non-Goals

**Goals:**

- One choice in the leave question that saves and then completes the navigation the owner started.
- Every way the save can stop behaves exactly as pressing Save does, and the owner stays on the editor.

**Non-Goals:**

- Save and leave in the person editor. The guard offers it only to pages that can save, so the person page keeps today's question; adding it there later is a `save()` on `PersonPage`.
- The browser's `beforeunload` question on closing or reloading: browsers allow no custom buttons.

## Decisions

### D1. A third answer in `ConfirmService`

`Confirmation` gains an optional `alternative?: string` label. A new `ConfirmService.choose(confirmation)` resolves `'confirm' | 'alternative' | 'cancel'`, and `ask()` becomes `(await choose(c)) === 'confirm'`, so every current caller is unchanged. `ConfirmDialog` closes with that answer instead of a boolean; any other close is still `'cancel'`.

- _Why:_ the dialog, its alert role and its lazy load stay in one place, and the delete and publish questions keep their two buttons.
- _Alternative:_ a separate leave dialog component. It would duplicate the dialog's markup and the lazy-load path for one extra button.

### D2. Button order and look

With an alternative the footer reads Stay, Leave, Save and leave, in that DOM order. Save and leave is the primary (default) button. Leave keeps the destructive variant, the same tinted button as Delete in the other questions, so all three buttons share one shape and the gaps between them read evenly. Every question also gets the panel's 24px gap between its text and its buttons, and a fixed width on wider screens, so short and long questions look alike.

- Stay stays first, so the dialog's first-tabbable focus lands on the safe choice as it does now, and Enter never discards edits.
- The helm footer stacks in reverse on a phone, putting Save and leave on top within thumb reach.

### D3. The guard asks the page to save

`HasUnsavedEdits` gains an optional `save?(): Promise<boolean>`. When the page has it, the guard calls `choose({ ...LEAVE_QUESTION, alternative: 'Save and leave' })`; `'alternative'` returns `page.save()`, so the router leaves exactly when the save left nothing unsaved. `'confirm'` returns `true`, `'cancel'` returns `false`. A page without `save()` gets `ask(LEAVE_QUESTION)` as today.

- `ArtworkEditorPage.save()` already fits the signature, so the editor itself does not change.
- The leave dialog has closed before `save()` runs, so the "Publish with missing details?" question opens on its own, not stacked over it.
- The router waits for the guard's promise; the "Saved" toast lives in the shell's toaster, so it still shows on the page the owner lands on.

## Risks / Trade-offs

- [The second dialog opens while the first is still animating out] → `ConfirmService` resolves on `closed$`, which fires after the close; cover the publish-with-gaps path in the editor's component test, and in `admin-e2e`.
- [Navigation is held for the length of a save] → saves are a single `updateDoc`; a failure releases the guard with `false` and a toast.
- [This change depends on `add-admin-editing` being archived first for its spec delta] → archive `add-admin-editing` before archiving this change.

# Proposal

## Why

Leaving the artwork editor with unsaved edits asks "Leave without saving?" and offers only Stay or Leave. When the owner meant to keep the edits, they have to choose Stay, save, and then navigate again. A Save and leave choice does both in one step.

## What Changes

- The question the artwork editor asks before leaving with unsaved edits gets a third button, "Save and leave", next to Stay and Leave. It saves the edits as Save does and then continues to where the owner was going.
- When the save does not go through (a date that is not valid, the owner backs out of "Publish with missing details?", or the write fails), the editor stays open with the edits kept, and says why as Save already does.
- It applies to every move inside the admin that the leave question already covers: another admin page, back to the artworks, and previous or next artwork.
- The person editor and the browser's own question on closing or reloading the tab stay as they are: the browser's dialog cannot get extra buttons.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `artwork-editing`: adds "Leaving the editor can save first", which puts Save and leave in the question that "Edits are saved together" asks before leaving with unsaved edits. The capability's main spec is created when the open `add-admin-editing` change is archived, so archive that change before this one.

## Impact

- `apps/admin/src/app/shared`: `ConfirmService` and `ConfirmDialog` learn an optional third answer; `unsavedEditsGuard` offers Save and leave when the page can save, and `HasUnsavedEdits` gets an optional `save()`.
- `apps/admin/src/app/artworks/editor/editor.ts`: its existing `save()` serves the guard; no template change.
- Tests: `confirm.service.spec.ts`, `unsaved-edits.guard.spec.ts`, `editor.spec.ts`, and an `admin-e2e` flow.
- No data, rules or functions changes.

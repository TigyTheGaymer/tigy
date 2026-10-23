# Tasks

Run tasks through Nx (`npx nx ...`).

## 1. A third answer in the confirm dialog

- [x] 1.1 Add `alternative?: string` to `Confirmation` and `ConfirmService.choose()` resolving `'confirm' | 'alternative' | 'cancel'`, with `ask()` built on it; make `ConfirmDialog` close with that answer and, when an alternative is given, show Stay, Leave (the destructive button, as Delete) and the alternative as the primary button, in that order (design D1, D2); verify with `confirm.service.spec.ts` tests for each of the three answers, Escape resolving `'cancel'`, `ask()` still resolving `true`/`false` and the button order, passing with `npx nx test admin`
- [x] 1.2 Teach `FakeConfirmService` in `apps/admin/src/app/testing.ts` a `choose()` that takes queued answers (so a test can answer the leave question and then the publish question differently) while `ask()` keeps working for current tests; verify with `npx nx test admin` passing unchanged

## 2. The guard saves when asked

- [x] 2.1 Add the optional `save?(): Promise<boolean>` to `HasUnsavedEdits` and make `unsavedEditsGuard` offer "Save and leave" through `choose()` for pages that have it, returning `page.save()` for that answer, and keep `ask(LEAVE_QUESTION)` for pages without it (design D3); verify with `unsaved-edits.guard.spec.ts` tests for a clean page, Stay, Leave, Save and leave with a save that succeeds and one that fails, and a page without `save()` getting the two-button question
- [x] 2.2 Cover the artwork editor's flows in `editor.spec.ts`: "Saving on the way out", "Leaving without saving", "Staying", "Moving to the next artwork" (Alt+Right), "Date that does not exist", "Backing out of publishing with missing details" and "Save fails on the way out"; and check in `person-page.spec.ts` that the person page still asks with only Stay and Leave; verify with `npx nx test admin`
- [x] 2.3 Add an `admin-e2e` flow next to "Leaving with unsaved edits asks, and staying keeps the edit": change the title, open People, choose Save and leave, and check the People page opens and the stored title changed (read with the Admin SDK helper), and that the dialog opens focused on Stay (jsdom has no layout, so the focus trap cannot be checked in unit tests); verify with `npx nx e2e admin-e2e`

## 3. Checks

- [x] 3.1 Run `npx nx run-many -t lint test typecheck build -p admin` and check at a phone width that Save and leave sits on top of the stacked buttons and the dialog opens with Stay focused, as the `@phone` e2e test "The leave question on a phone puts Save and leave on top and focuses Stay"

## Workflow follow-up

- Archive `add-admin-editing` before archiving this change, so the `artwork-editing` main spec exists for this change's ADDED requirement.

# Design

## Context

- `NsfwSwitchService` keeps the switch in `localStorage` (`tigy.nsfw`) through `storedSignal`. The stored value applies only after the first render, so server and hydration HTML always show the switch off.
- Three controls show NSFW art: the `NsfwSwitch` checkbox (in both `TopBar` and `StageBar`), and the artwork page's confirm screen buttons `showPiece()` (adds the piece to `ConfirmedPiecesService`, in `sessionStorage`) and `showAll()` (calls `nsfwSwitch.set(true)`).
- `FullView` already uses a native `<dialog>` opened with `showModal()` after render. That is the pattern to follow.
- `visitor-privacy` forbids cookies and third-party requests, so the check has to run entirely in the browser.

## Goals / Non-Goals

**Goals:**

- One age check that every NSFW entry point goes through, so a new entry point can't skip it by accident.
- One dialog on the page, whichever control opened it.
- Keep only one flag in storage, never the birthday.

**Non-Goals:**

- Real age verification (ID checks or a third-party service). The visitor states their own birthday.
- Remembering refusals or blocking retries. Turning down a visitor stores nothing, as the user decided.
- Any change to the server, the API or `?nsfw=1`. The gate only decides what the page asks for.
- Any change to the privacy page. Its general "display settings are kept" wording is left as it is.

## Decisions

### An `AgeCheckService` owns the flag and the pending request

`nsfw/age-check.service.ts` holds:

- `isPassed`: a `storedSignal(LOCAL_STORAGE, 'tigy.nsfw.age', …)` storing `'1'` once passed, like `tigy.nsfw`.
- `isPending`: true while an action waits on the check. The action itself sits in a private signal.
- `confirm(then: () => void)`: runs `then` at once if `isPassed()`, otherwise keeps it waiting, which opens the dialog.
- `pass()` (sets the flag, runs and clears the pending action) and `dismiss()` (clears it).

A callback in a signal suits the "signals first" rule better than a `Promise` or an `Observable`, and every caller only needs "do this once allowed". _Alternative:_ each control opens its own dialog. That means three copies of the dialog, two of them in the header at once, and a fourth for any new entry point.

The age rule is a pure exported function, `isAdult(birthday: string, today: Date): boolean`, in the same file. It compares the year, month and day in the visitor's local time zone, so turning 18 today passes, and someone born on 29 February turns 18 on 1 March in non-leap years.

### `NsfwSwitchService` routes through the check

- `isOn` becomes `computed(() => stored() && ageCheck.isPassed())`. A switch stored on before this change, with no flag, reads off, as the spec asks, and nothing needs migrating.
- `set(true)` calls `ageCheck.confirm(() => stored.set(true))`. `set(false)` stays as it is. `artwork.showAll()` needs no change.
- `artwork.showPiece()` wraps its `confirmedPieces.add()` in `ageCheck.confirm()`.

_Alternative:_ gate in each component. That is easier to forget in the next entry point, and wouldn't cover the stored-on case.

### The checkbox snaps back while the check is pending

When the check hasn't passed, `nsfwSwitch.set(true)` leaves `isOn()` false, so the `[checked]` binding doesn't change and Angular won't reset the native checkbox. The `(change)` handler sets `toggle.checked = nsfwSwitch.isOn()` after calling `set`. Once the check passes, `isOn()` turns true and the binding updates the box.

### One `AgeCheckDialog` in `app.html`

`nsfw/age-check-dialog/age-check-dialog.ts`, in its own folder with its `.html`, `.css` and spec like `artwork/full-view/`, is placed once at the top of `app.html`. That keeps `<app-site-footer />` the app's last element, and a modal dialog shows in the top layer wherever it sits in the DOM.

- The `<dialog>` renders only while `isPending()` is true. So no page's HTML, server-rendered or not, carries the dialog's NSFW wording, which would otherwise sit hidden on every SFW page that search engines index.
- An `afterRenderEffect` calls `showModal()` once the dialog has rendered. It runs only in the browser and after rendering, unlike `effect()`, so the element exists by then. The dialog's `close` event calls `dismiss()`.
- The form holds a labelled `<input type="date" required>` with `min` at 1900-01-01 and `max` at today, plus Confirm and Cancel buttons. `max` is worked out again each time the dialog opens, so a tab left open past midnight gets the new day. The native date input is localized and accessible on every target browser. Three separate selects would add code and still need validation. A single input doesn't need Angular forms: the submit handler reads the input's value and checks `isAdult`.
- Empty, too early or future dates: native validation (`required`, `min`, `max`) blocks the submit and shows the browser's message. The handler also rejects them, in case a browser lets them through.
- Under 18: the dialog swaps its form for a short "NSFW art isn't available" message with a Close button. Because that replaces the focused Confirm button, a second `afterRenderEffect` moves focus to Close, so it stays inside the dialog. `isRefused` resets when the dialog closes.
- Passing: the handler calls `pass()` and then `close()`, before the next render removes the dialog. The order doesn't depend on when the browser fires `close`.
- The native `<dialog>` returns focus to the control that opened it when it closes, which covers the focus scenario without extra code.

## Risks / Trade-offs

- [The visitor can lie or clear the flag] → Accepted. This is a self-declared check, not verification (see Non-Goals).
- [Visitors who already had the switch on see it off once] → Accepted, and required by the spec. They pass the check once.
- [Storage refused, so the flag can't persist] → `storedSignal` still holds it in memory, so the check asks again only after a reload. This matches the "No storage" scenario.
- [e2e tests that call `toggle.check()` now leave the switch off] → Update `nsfw.spec.ts`, `privacy.spec.ts` and `design.spec.ts` to pass the dialog, or to seed `tigy.nsfw.age` with `addInitScript` where the check isn't under test.
- [The dialog's element doesn't exist when a check starts] → `afterRenderEffect` opens it after the render that creates it.

## Migration Plan

Nothing to migrate: the new key is additive. To roll back, revert the commit. Browsers left holding a `tigy.nsfw.age` key are harmless.

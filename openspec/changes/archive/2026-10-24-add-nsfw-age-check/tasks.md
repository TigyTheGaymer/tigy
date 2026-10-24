# Tasks

## 1. Age check service

- [x] 1.1 Add `isAdult(birthday, today)` to `apps/public/src/app/nsfw/age-check.service.ts` and verify that `age-check.service.spec.ts` covers: 18 years ago today passes, a day short fails, a 29 February birthday passes on 1 March of a non-leap year but not on 28 February, and empty or future dates fail
- [x] 1.2 Add `AgeCheckService` (`@Service()`), with `isPassed` stored as `tigy.nsfw.age`, `isPending`, `confirm(then)`, `pass()` and `dismiss()`. Verify with specs that `confirm` runs at once when passed and otherwise sets `isPending`; that `pass` stores only `'1'` and runs the action once; that `dismiss` runs nothing and stores nothing; and that a refused `localStorage` still passes in memory

## 2. Gate the switch and the confirm screen

- [x] 2.1 Make `NsfwSwitchService.isOn` require `isPassed()` and route `set(true)` through `confirm()`. Update `nsfw-switch.service.spec.ts` and verify: a stored `tigy.nsfw` without `tigy.nsfw.age` reads off, `set(true)` before passing leaves it off and pending, and `set(false)` never asks
- [x] 2.2 In `NsfwSwitch`, reset `toggle.checked` to `isOn()` after `set()`. Verify with a component spec that clicking the switch before passing leaves it unchecked and opens a pending check
- [x] 2.3 Wrap `showPiece()` in `artwork.ts` with `confirm()`. Update `artwork.spec.ts` and verify that both confirm screen buttons reveal nothing until the check passes, and that their existing tests still pass once `tigy.nsfw.age` is seeded

## 3. Age check dialog

- [x] 3.1 Create `AgeCheckDialog` in `apps/public/src/app/nsfw/age-check-dialog/` (a native `<dialog>` rendered only while `isPending()` and opened with `afterRenderEffect`; a labelled date input with `required`, `min` at 1900-01-01 and `max` at today, worked out again on each opening; Confirm and Cancel; an under-18 message state that moves focus to Close) and place it once at the top of `app.html`. Verify with `age-check-dialog.spec.ts`: nothing renders until something asks, it opens when `isPending()` turns true, an adult birthday calls `pass()` and closes, an under-18 birthday shows the message, focuses Close and stores nothing, empty, too early and future dates keep it open, and closing calls `dismiss()`
- [x] 3.2 Style the dialog to match the site's panels and both themes, and verify by looking at it in light and dark mode at phone and desktop widths in the running app

## 4. End-to-end

- [x] 4.1 Update `apps/public-e2e/src/nsfw.spec.ts` with the age check scenarios (first switch-on opens the dialog, adult passes and holds after reload, under 18 refuses and asks again, closing leaves the switch off and focus on it, "Show this piece" and "Show NSFW everywhere" ask first, stored-on without the check loads off). Seed `tigy.nsfw.age` in the existing tests, then verify `npx nx e2e public-e2e` passes
- [x] 4.2 Make `privacy.spec.ts` and `design.spec.ts` pass the dialog or seed `tigy.nsfw.age`, and verify the whole public e2e suite passes, the cookie and same-origin checks included
- [x] 4.3 Run `npx nx run-many -t lint test build -p public` and verify everything passes

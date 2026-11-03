# Tasks

## 1. The stage's layout

- [x] 1.1 Add the `is-docked` variant to `stage-bar.css` and set it on the artwork page's `<app-stage-bar>`; verify with an e2e test that the bar has no fade on an artwork page, and that it still floats on `/privacy` and a not-found page.
- [x] 1.2 Turn `.stage` into the named grid with a `.frame` around the piece, and move the arrows into their areas; verify that the existing `artwork.spec.ts` tests and the "Keyboard focus stays on the arrow" e2e test still pass, and with an e2e test for "Vertical piece under the bar" and "Wide piece between the arrows" that compares bounding boxes.
- [x] 1.3 Place `.stage-panel` in the frame area; verify with an e2e test for "Confirm screen on a laptop".

## 2. The piece fills the free space

- [x] 2.1 Add `pieceShape`, bind it on `.stage`, and replace the `.piece img` and `.player` sizing with the shared rule, removing `--natural-w`, `--max-w` and `--max-h`; verify with e2e tests for "Small picture", "Vertical picture", "Wide picture" and "Square picture" at 1440×900, seeding pieces of those sizes, that each is inside the stage and reaches the free space's limit on one axis.
- [x] 2.2 Verify "Small video" with an e2e test that the player reaches the free space's limit, and that the existing `video.spec.ts` tests still pass.
- [x] 2.3 Verify "Closing the credits panel", "Resizing the window" and "The newest piece" with e2e tests comparing bounding boxes before and after.
- [x] 2.4 Verify "First HTML" with an e2e test using `withoutAppScripts`.
- [x] 2.5 Add `shownShape` and use it on `.stage`; verify with `artwork.spec.ts` tests for "From a wide piece to a vertical one" and "The new image fails".

## 3. Phones and narrow windows

- [x] 3.1 Rework the 1100 px and 720 px breakpoints: keep the stage at `76svh`, remove the old height sums, add the phone arrow row, and turn the hover scale off at 720 px and below; verify with e2e tests for "On a phone" and "On a tablet", and that the existing "On a phone" controls test and "Swipe on a phone" test still pass.

## 4. Full view

- [x] 4.1 Add the `shape` input to `FullView`, pass `pieceShape` from the page, and make its stage a size container using the shared rule; verify with e2e tests for "Opening a small piece" and "Dragging a zoomed vertical piece", and that the existing full view tests still pass.

## 5. The whole page

- [x] 5.1 Run `npx nx run-many -t lint test build -p public` and the `public-e2e` suite, and verify that they pass.
- [x] 5.2 Restart the "public" preview and take screenshots of small, vertical, wide and square pieces at 1440×900, 768×1024 and 375×812, with the credits panel open and closed on the wide screen; verify by eye that nothing is cut off or covered.
- [x] 5.3 At 812×375, open an NSFW piece with the switch off and verify that the confirm screen's choices can still be reached.

## 6. Review follow-ups

- [x] 6.1 Add `shapeOf()` to `shared/` and use it in `pieceShape` and `toTile`; verify with `shape.spec.ts`, the tile tests and an `artwork.spec.ts` test for a size that is not known.
- [x] 6.2 Move the sizing rule to a global `.fitted` class, name the variable `--shape` everywhere, and move `withoutAppScripts` to `support/`; verify that the `artwork-fit` and `design` e2e specs pass.
- [x] 6.3 Make docking a `StageBar` input with a host class; verify that "the stage bar" e2e tests pass.
- [x] 6.4 Hold the shape only with an old image on screen, and make `shownShape` read-only; verify with `artwork.spec.ts` tests for moving from a video and from the confirm screen.
- [x] 6.5 Clamp full view's panning from the fit's own sum; verify that "Dragging a zoomed vertical piece" passes within half a pixel.
- [x] 6.6 Verify that full view gets the new piece's shape while the image loads, with an `artwork.spec.ts` test.
- [x] 6.7 Fit the stage bar's controls on a 320 px wide screen; verify with an e2e test for "On a small phone".

## Workflow follow-up

- Archive the change once it has been reviewed and merged.

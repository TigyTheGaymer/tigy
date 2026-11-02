# Tasks

## 1. The piece on screen comes from its data

- [x] 1.1 Add `shownPiece()` in `artwork/shown-piece.ts`, a `linkedSignal` over `resource.snapshot` and the request with a pure computation, and verify with `shown-piece.spec.ts` covering every row of the table in design.md, including a request and snapshot changing on the same tick.
- [x] 1.2 Use it for `data()` in `ArtworkPage`, add `isMoving`, and take `fullImage`, `video`, `originalHref`, `share()` and `copySafeLink()` from `data().artwork` instead of `id()`; verify with an `artwork.spec.ts` test that during a move the `<img>` still has the old piece's `src`.
- [x] 1.3 Verify with `artwork.spec.ts` tests for "Moving to a deleted piece" and "Moving when the server fails", and that a server error while reloading the same piece keeps its details.
- [x] 1.4 Verify "Moving to an NSFW piece with the switch off" with an `artwork.spec.ts` test that a held SFW piece never gets the new piece's file URL, then the confirm screen replaces it.
- [x] 1.5 Verify "Going back and forth", "The piece changed meanwhile" and "The piece is gone" with `artwork.spec.ts` tests.

## 2. An always-present page

- [x] 2.1 Remove the `@if (data())` loading gates from `artwork.html`, keeping `@if (isMissing())` and the content conditions, and verify with an `artwork.spec.ts` test that the stage bar and credits panel elements are the same nodes before and after a move.
- [x] 2.2 Make `CreditsPanel.page` an optional signal input and add its `isWaiting` input, and verify with credits panel tests that it draws skeleton rows without a page and the real rows with one.
- [x] 2.3 Keep the toolbar controls in fixed slots: disabled share, download and full view when unusable, a spacer for a video's full view, and an always-enabled info toggle. Verify with `artwork.spec.ts` tests for "Moving from an image to a video" and "NSFW piece behind the confirm screen", including that the download has no `href` behind the confirm screen, and update the tests that expected the controls gone.

## 3. Moves

- [x] 3.1 Add computed arrow links that point at the current `id()` while moving, with `aria-disabled`, and make `go()` return early; verify with `artwork.spec.ts` tests for "Pressing next twice" and "Pressing previous while on the way", covering a link, an arrow key and a swipe.
- [x] 3.2 Split `playVideos` into `afterRenderEffect` `write` steps, one pausing when `id()` changes and one resetting `muted` and playing when the shown piece changes; verify with `artwork.spec.ts` tests for "Moving away with the sound on" and "Moving from a video to a video", keeping the existing video-to-image and leaving-the-page tests passing.
- [x] 3.3 Reset `.info-wrap`'s scroll in an `afterRenderEffect` `write` step, through a `viewChild`, and verify with a test for "Moving after scrolling the credits".

## 4. Image swap and skeletons

- [x] 4.1 Add `imageSrc` and the `isImageWaiting` `linkedSignal`, cleared by `(load)` and `(error)` and using `Router.navigated` read at construction; verify with `artwork.spec.ts` tests that a move waits and a load or failed load ends the wait, that it is false on a first page and true when arriving from another page.
- [x] 4.2 Add the `Skeleton` component in `artwork/skeleton/skeleton.ts` with its `isDelayed` input, the delay and shimmer in CSS, and shimmer off under `prefers-reduced-motion`; verify with a spec test for its markup and an e2e check of "Reduced motion" using Playwright's reduced-motion emulation.
- [x] 4.3 Add the stage and credits waiting conditions, `isDelayed` decided when a wait starts, and `aria-busy`; verify with `artwork.spec.ts` tests for which skeletons render in "Opening a piece from the gallery", during a move, and after a failure.

## 5. Whole-page checks in a real browser

- [x] 5.1 Add e2e tests to `apps/public-e2e/src/artwork.spec.ts` that hold `/api/artworks/*` with `page.route`, for "Moving to the next piece", "Keyboard focus stays on the arrow", "Move at normal speed", "Slow move" and "Slow image", checking the skeleton's computed opacity before and after 300 ms, plus a check that the Show NSFW switch's position doesn't change; verify with `npx nx e2e public-e2e`.
- [x] 5.2 Add e2e tests for "Direct link", that the first HTML holds no skeleton and the page shows no skeleton after hydration, with no hydration errors in the console; verify with `npx nx e2e public-e2e`.
- [x] 5.3 Add an e2e test that the browser makes no file request for an NSFW piece behind the confirm screen after a move; verify with `npx nx e2e public-e2e`.
- [x] 5.4 Confirm that an old image isn't stretched while a new one of a different shape loads, with an e2e test in Chromium (the only configured project) that measures the image's box mid-load on a delayed image route, and by hand in Firefox and Safari; switch to the `new Image()` plus `decode()` approach from design.md if it is stretched.
- [x] 5.5 Review the diff against `.claude/rules/angular.md` and the conventions table in design.md, and verify it adds no `effect()`, `setTimeout`, `.subscribe()`, `fetch()`, `ActivatedRoute`, `@Injectable` or `@angular/animations`.
- [x] 5.6 Run `npx nx run-many -t lint test build -p public` and `npx nx e2e public-e2e`, and verify both pass.

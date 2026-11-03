# Design

## Context

See proposal.md for why, and the `public-pages` delta for the behaviour.

`.stage` is a centring grid, and the bar and arrows float over it with `position: absolute`. Because the layout can't see them, their room is typed by hand in several places: `100% - 140px`, `100svh - 150px`, `76svh - 120px`.

The image sits in a `<button>` that shrinks to fit it, so `max-width: calc(100% - 140px)` resolves against the image's own width. Any image narrower than the stage loses 140 px, after the height limit has already narrowed it. Videos are direct children of the stage, so they escape this, but `--natural-w` caps them at their file's size.

Measured in Chromium on an isolated copy of this CSS (not the running app):

| Stage | File | Now | With this design |
| --- | --- | --- | --- |
| 989×1247 | 440×242 | 300×165 | 849×467 |
| 989×1247 | 1000×1600 | 546×873 | 728×1165 |
| 989×900 | 1000×1600 | 329×526 | 511×818 |
| 989×900 | 800×800 | 610×610 | 818×818 |
| 989×900 | 2048×1000 | 849×415 | 849×415 |

A prototype of the layout below ran at 6 stage sizes and 6 shapes, including a 1:5 strip. In all 36 combinations the image was inside the stage and clear of the bar and arrows.

`file.w` and `file.h` hold the upright size, including for sideways photos (`web-versions.spec.ts`), so they give a reliable shape on the server and in the first HTML.

`StageBar` is shared with the privacy and not-found pages, which rely on it floating.

## Goals / Non-Goals

**Goals:**

- One rule for images and videos, in CSS, with no JavaScript measuring and no layout shift after hydration.
- No hand-kept sizes for the bar: the layout measures it, including when `--control` shrinks at 420 px.

**Non-Goals:**

- A full-height stage at 1100 px and below. The credits keep peeking in, so vertical pieces on phones stay about the size they are today; small pieces and windows from 721 to 1100 px still gain.
- Controls floating over the art or hiding themselves, as Google Photos does.
- Sharper files for small pieces, or a `pixelated` rendering mode. Enlarged pieces use the browser's normal smoothing.
- Changing the gallery tiles, the privacy page or the not-found page.

## Decisions

### The stage is a grid with named areas

```
+------+----------------+------+
| bar  | bar            | bar  |  auto
+------+----------------+------+
| prev | frame          | next |  minmax(0, 1fr)
+------+----------------+------+
|      |                |      |  16px
+------+----------------+------+
```

The arrows move from `position: absolute` into `prev` and `next`, which also centres them on the piece rather than on the stage. Their order in the template stays as it is, so the arrow nodes and their focus survive a move. The skeleton stays absolute over the whole stage, under the bar and arrows.

Alternative: keep the bar and arrows floating and derive the margins from tokens. This still needs a parallel set of sums per breakpoint, and any change to the bar would silently break them.

### A `.frame` holds the piece and is the size container

`.frame` fills its area with `container-type: size` and centres its child. Images, videos and full view share one global class, `.fitted`, in `styles.css`:

```css
width: min(100cqw, 100cqh * var(--shape));
height: auto;
aspect-ratio: var(--shape);
```

`--shape` is bound on `.stage`, which is always rendered, so `shownShape` also sees the states with no image. It uses the same name as the gallery tiles' `--shape`, and `shapeOf()` in `shared/` is shared with them, square when a size isn't known. A global custom property can't hold this rule, because `var(--shape)` would resolve at `:root`, where it isn't set. `object-fit: contain` stays on the image, so if a stored size is ever wrong the piece gets bars instead of being stretched.

Alternative: `width: 100%; height: 100%; object-fit: contain` on the image. It needs no shape, but the element's box includes the empty bars, so rounded corners land on the box instead of the art, and clicks in the empty space would open full view.

The container can't be the `<button>` for the same reason: only the art should be clickable.

### Arrow columns have a fixed width from the token

`calc(18px + var(--control-arrow))` on both sides, kept even when an arrow is absent. Columns sized `auto` would collapse on the first and last pieces and make the image jump sideways.

### The bar joins the layout through an input

`<app-stage-bar [isDocked]="true">` on the artwork page. The input sets a host class, as `Skeleton` does with `isDelayed`, so the compiler checks it. `:host(.is-docked) .stage-top` is `position: static` in the `bar` area, with no gradient and equal top and bottom padding. The host is `display: contents`, so `.stage-top` is a grid item of the stage. Without the input, the other two pages are unaffected.

The 26 px bottom padding existed only to carry the fade. Keeping it would cost that height for nothing.

### Phones get an arrow row

At 720 px and below, the areas become `bar bar` / `frame frame` / `prev next`, with the last row at `calc(var(--control-arrow) + 14px)`: 4 px above the arrows and 10 px below. A fixed height keeps the piece in place when one arrow is missing.

Measured on a 375×812 phone, with the bar at 65 px: the seeded 1620×2117 piece shows at 372×486, against about 380×497 calculated for today. The small loss buys arrows that can't touch the piece.

The hover scale is turned off at this width, because a piece filling the width would be clipped by the stage's `overflow: hidden`.

The stacked stage keeps `76svh`, and the sums in `.piece img` and `.player` at each breakpoint go away.

### The old image holds its shape while the new one loads

The `<img>` keeps showing the old file until the new one has loaded, but a `--shape` from the new piece would reshape its box at once. `ArtworkPage` gets two signals:

- `pieceShape`, a `computed` from `answered()`, used for full view;
- `shownShape`, a read-only `linkedSignal` over `pieceShape`, `isImageWaiting` and whether an image is shown. It keeps its previous value only while waiting with an old image on screen, and otherwise follows `pieceShape`. It is bound on `.stage`.

A load error ends the wait, so the shape can't stick. `isImageWaiting` is false on the landing piece, so the first HTML has the right shape. Moving from a video or the confirm screen has no old image, so the new shape applies at once.

### Full view takes the shape as an input

`FullView` gets `shape = input.required<number>()`. Its `.stage` becomes a size container and the image uses `.fitted`. `apply()` clamps panning from the same sum as the fit, using the stage's size and `shape()`, because the image's `offsetWidth` rounds and zooming would multiply the error.

Alternative: fill the stage with `object-fit: contain`. It adds nothing, since the clamp needs the art's size either way.

### Stage panels sit in the frame area

The confirm and error `.stage-panel`s are placed in `frame` with `place-self: center`, directly in the stage. They aren't in `.frame`, so a size container doesn't constrain their height.

## Risks / Trade-offs

- [Enlarged small pieces look soft] → Accepted: filling the space was asked for. Full view and the original download are unchanged in quality.
- [The 1% hover scale overlaps an arrow by about 4 px on a piece at full width] → The arrow stays on top and the overlap lasts only while hovering, so this is accepted.
- [Very short screens: on an 812×375 phone in landscape the free space is about 203 px, shorter than the confirm panel] → It was already clipped by the 285 px stage, and the centre moves by at most 25 px. Tasks check that its choices can still be reached.

## Migration Plan

None. CSS and template only, with no data changes. Reverting the commit restores the old layout.

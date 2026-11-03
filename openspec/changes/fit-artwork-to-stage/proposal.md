# Proposal

## Why

The artwork page doesn't use the space it has. Pieces never grow past their file's size, so a small one sits in the middle of an empty stage, and every image narrower than the stage loses another 140 px of width because the arrows' margin is taken from the image rather than the stage. Vertical pieces lose the most: a 1000×1600 image on a 989×900 stage shows at 329×526 when 511×818 fits.

## What Changes

- Every piece, whatever its shape or file size, is shown at the largest size that fits the free space on the stage, without being cut off. Small pieces are enlarged, with no cap, and look softer as a result.
- The free space comes from the page's real layout: the stage bar and arrows take their own room and the piece gets what is left, so no control covers it and it follows window, phone and credits panel changes by itself.
- Videos follow the same sizing and lose their file-size cap.
- Full view fits the piece to the screen in the same way, so opening a small piece never makes it smaller.
- The stage bar loses its dark fade on the artwork page, since art no longer sits under it. The privacy and not-found pages keep their bar as it is.
- The NSFW confirm screen and the error message are centred in the same free space.
- The old image keeps its own shape until the new one has loaded when moving between pieces.
- At 1100 px wide and below the stage stays at 76% of the screen's height, so the credits still peek in below it. On phones the arrows get a row of their own under the piece.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `public-pages`: adds how a piece fits the artwork page's stage and the full view, and that the page's controls never cover it.

## Impact

- `apps/public/src/app/artwork/` (`artwork.html`, `artwork.css`, `artwork.ts`, `artwork.spec.ts`), and `full-view/` (template, styles, a new input for the piece's shape).
- `apps/public/src/app/chrome/stage-bar.css`, for a variant that takes a row of the stage's layout.
- e2e specs in `apps/public-e2e/src/` for the fit at several screen sizes.
- No changes to the API, the data or the stored files. The first HTML already has the piece's dimensions, so it renders at its final size without JavaScript.

# Proposal

## Why

Moving to the previous or next piece makes the whole artwork page flicker. It is not a page reload: the page drops its piece as soon as the address changes, which removes the image, arrows, most of the toolbar and the credits panel, then rebuilds them all when the new data arrives. Going back and forth blinks on every move, and a slower connection leaves the stage empty for longer.

## What Changes

- The artwork page stays in place while moving between pieces. Only the parts whose data changed update: the details when the response arrives, the image once the new one has loaded.
- The stage bar's buttons keep their positions on every piece, so the Show NSFW switch stops moving.
- Skeletons appear only when needed: when the page has nothing to show yet, or when a move is still waiting after a short delay. A direct link still arrives finished from the server and shows none.
- Pieces already visited since opening the artwork page show instantly and refresh in the background.
- The arrows and arrow keys ignore moves until the new piece's links arrive, so a move can't skip a piece.
- A playing video stops at the moment of the move, and the credits panel returns to its top for each new piece.
- A piece's image or video file is never requested before its data has confirmed it may be shown. A missing piece still renders the not-found page, and a failed load shows the error.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `public-pages`: adds how the artwork page behaves while moving between pieces and while its data loads.

## Impact

- `apps/public/src/app/artwork/` (page and credits panel, templates, styles and specs, plus new `shown-piece.ts` and `skeleton/`), and `apps/public/src/app/chrome/stage-bar.css` so the controls fit a phone.
- `piece-title.pipe.ts` moves from `shared/` to `artwork/`, and `resources.ts` from `shared/` to `home/`, because only those features use them.
- e2e specs in `apps/public-e2e/src/` for moving between pieces.
- No changes to the API, the data or the server rendering. The first HTML of a page stays the same.

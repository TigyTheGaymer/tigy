# Proposal

## Why

Hovering a gallery thumbnail shows the piece's title in a small label. A piece without a title shows the label "Untitled", which adds nothing and reads like a placeholder left in by mistake.

## What Changes

- On the home gallery, a thumbnail of a piece without a title no longer shows a label on hover or keyboard focus. Titled pieces keep their label.
- The thumbnail link's accessible name stays "Untitled" (plus ", NSFW" where it applies), so screen readers still announce something for the link.
- Out of scope: the "Untitled" heading in the artwork page's credits panel, the Previous/Next and Full view button labels, image alt text, and link-preview metadata keep their current wording.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `public-gallery`: adds a requirement for the title label shown on a thumbnail on hover or focus, which is shown only for titled pieces.

## Impact

- `apps/public/src/app/home/tiles/` (`tile.ts`, `tiles.html` and their tests).
- No data, API or admin changes.

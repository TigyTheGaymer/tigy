# Proposal

## Why

Some commissions are NSFW. After `add-public-gallery`, they are simply left out of every public list, so visitors who want to see them can't, and a direct link to one opens it without any warning. This change lets each visitor choose: NSFW images stay hidden by default, a "show NSFW" switch brings them in, direct links ask for confirmation first, and NSFW pages stay out of search engines.

Depends on `add-public-gallery` (public site, image pages, sets).

## What Changes

- **"Show NSFW" switch**: off for new visitors, remembered in the visitor's browser. When on, NSFW images appear in the gallery and among an image's other versions.
- **Confirm screen** on direct links to NSFW images, skipped when the switch is on.
- **Search exclusion**: NSFW image pages tell search engines not to index them.
- **Composite index** for lists that include NSFW images.

Out of scope: artist pages following the switch (`add-artists` builds them on top of this), and the visual design of the switch and confirm screen (separate UI/UX change).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `public-gallery`: the NSFW switch, other versions following the switch, the confirm screen on direct links, and keeping NSFW pages out of search.

## Impact

- **Code**: `apps/public` (switch, confirm screen, `noindex`), `firebase` (composite index).
- **Behaviour on the server**: none. Server HTML stays the NSFW-hidden view (A3), so CDN caching and link previews are unchanged.

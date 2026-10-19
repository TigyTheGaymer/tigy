# Proposal

## Why

This change is the public site's visual design and browsing controls. The site has a confirmed purpose: a showcase of art of Tigy, the owner's fursona, and a hub for the owner's socials. A mockup round compared several visual directions as static mockups, and the owner chose one: **Tigy's Album**, a photo album wearing Tigy's coat. The feature changes beneath it are built and archived: `define-data-model` stores the art and serves the gallery data, and `add-public-pages` built the plain, unstyled home, artwork and not-found pages. This change records the design and builds it onto those pages in `apps/public`.

## What Changes

- **The chosen design, "Tigy's Album".** Tigy's markings and palette (fur orange, cream, stripe maroon, paw pink, the forehead mark, flank stripes, paw prints, a ringed tail) on the mechanics of a photo album. The visual system is specified in `apps/public/DESIGN.md`; the mockup (`design/mockups/index.html`, `detail.html`) and the design sheet (`design/mockups/design-sheet.html`) are the reference.
- **Home header.** An open header straight on the page, with no card: the animated avatar, the name with the forehead mark, the short bio "A tiger" (fixed in the site), the piece count and date range, and the owner's social links. There is no footer; the social links live only here.
- **Social links with logos.** Each link shows its network's logo (Simple Icons, in the text colour) and the handle, or a generic link icon for a network without a logo; on phones the header's links become icon-only buttons with the network and handle as their accessible name. Credits on the artwork page use the same links.
- **Gallery.** One continuous justified gallery, newest first, with each thumbnail at its piece's real shape and no year or month sections. Further pages load automatically as the visitor nears the end, replacing the "Load more" button, and going back from an artwork restores the loaded pieces and the scroll position for the rest of the visit.
- **Tail timeline.** A ringed-tail scroll timeline on the right edge that stands for the whole gallery as filtered, fills as the visitor scrolls, marks the years (no months) and can be dragged, loading pages until a chosen year arrives; a thin ringed bar on phones. The gallery endpoint adds per-year counts of the matching pieces for it.
- **Artwork page.** A photo viewer: the piece on a calm dark stage, previous/next (buttons, arrow keys, swipe), share, download of the original, full view with zoom and pan (the full image at once, the original once loaded), and a flat credits panel (title, description, date or the day added, artists, characters with their links, tags, original file, and for NSFW pieces a "Copy safe link" button). The panel is open by default and remembers being closed; on narrower screens it moves below the stage.
- **Theme switch.** Automatic (follows the device), Light and Dark, remembered in the visitor's browser and applied before the first paint.
- **NSFW in the chrome.** The "Show NSFW" switch sits in the top bar; a direct link to an NSFW piece shows a plain confirm panel without the image.
- **Filter row.** A row above the gallery with the active filters as removable chips and a newest/oldest sort chip, both working today, and the four filter pickers (Characters, Artists, Tags, Year) marked as coming later.

Out of scope: the filter pickers (they follow this design later; people and tags have no pages of their own); the admin site; the data model for artworks, people and tags (`define-data-model`).

## Capabilities

### New Capabilities

- `public-gallery`: the home header and social links, the gallery layout and the place it restores, the tail timeline, the artwork viewer and credits panel, sharing, the theme switch and the filter row. People, artworks and tags are the `gallery-catalog` capability; the pages themselves are `public-pages`.

### Modified Capabilities

- `public-pages`: "Loading more pieces" loads automatically instead of through a button, and the artwork page shows the day an undated piece was added.
- `gallery-catalog`: "Artwork links preview by default" offers both links of an NSFW piece on the artwork page, not in a share menu.

## Impact

- **Code:** `apps/public` (global styles and tokens, top bar, home header, gallery, timeline, artwork page, theme switch, icons), and the gallery endpoint's per-year counts in its server.
- **Dependencies:** `lucide-angular` for interface icons; the four Simple Icons social logos as copied SVGs; Grandstander and Nunito as self-hosted fonts, with the alternates Fredoka and Sour Gummy self-hosted but unused.
- **Design references:** `apps/public/DESIGN.md` and `apps/public/.impeccable/design.json` (normative visual system; updated where this change departs from them, such as the tail's month bubble), `design/mockups/` (the mockup, design sheet and font alternates, with the provided art in `design/mockups/assets/`).
- **Other changes:** builds on the archived `define-data-model` and `add-public-pages`; this change styles and extends their pages.

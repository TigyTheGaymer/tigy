# Proposal

## Why

This change is the public site's visual design and browsing controls. The feature changes that define the site's data and pages were removed so they can be written again from scratch, starting from this mockup. The site has a confirmed purpose: a showcase of art of Tigy, the owner's fursona, and a hub for the owner's socials. A mockup round compared several visual directions as static mockups, and the owner chose one: **Tigy's Album**, a photo album wearing Tigy's coat. This change records that design and builds it into `apps/public`.

## What Changes

- **The chosen design, "Tigy's Album".** Tigy's markings and palette (fur orange, cream, stripe maroon, paw pink, the forehead mark, flank stripes, paw prints, a ringed tail) on the mechanics of a photo album. The visual system is specified in `apps/public/DESIGN.md`; the mockup (`design/mockups/index.html`, `detail.html`) and the design sheet (`design/mockups/design-sheet.html`) are the reference.
- **Home header.** An open header straight on the page, with no card: the animated avatar, the name with the forehead mark, the short bio "A tiger", the piece count and date range, and the owner's social links. There is no footer; the social links live only here.
- **Social links with logos.** Each link shows its network's logo (Simple Icons, in the text colour) and the handle; on phones they become logo-only buttons with the network and handle as their accessible name.
- **Gallery.** One continuous justified gallery, newest first, with each thumbnail at its piece's real shape and no year or month sections. Further pages load automatically as the visitor nears the end, and returning from an artwork restores the scroll position.
- **Tail timeline.** A ringed-tail scroll timeline on the right edge that fills as the visitor scrolls, marks the years and can be dragged; a thin ringed bar on phones.
- **Artwork page.** A photo viewer: the piece on a calm dark stage, previous/next (buttons, arrow keys, swipe), share, download of the original, full view with zoom and pan, and a flat credits panel (title, description, date, artists, characters with links to their owners, tags, set and other versions, original file). On narrower screens the panel moves below the stage.
- **Theme switch.** Automatic (follows the device), Light and Dark, remembered in the visitor's browser and applied before the first paint.
- **NSFW in the chrome.** The "Show NSFW" switch sits in the top bar; a direct link to an NSFW piece shows a plain confirm panel without the image.
- **Filter row, design only.** A row of filter chips (Characters, Artists, Tags, Year) sits above the gallery, marked as coming later. It does not filter yet.

Out of scope: the person, character and tag pages and the working filters (they follow this design later); the admin site; the data model for people, characters and tags, which was explored but paused (see design.md).

## Capabilities

### New Capabilities

- `public-gallery`: the home header and social links, the gallery layout and its loading, the tail timeline, the artwork viewer and credits panel, the theme switch, and where the NSFW switch and confirm panel live. Whether people, characters and tags become a capability of their own is decided with the data model.

### Modified Capabilities

- None.

## Impact

- **Code:** `apps/public` (global styles and tokens, top bar, home header, gallery, timeline, artwork page, theme switch, icons).
- **Dependencies:** `lucide-angular` for interface icons; the four Simple Icons social logos as copied SVGs; Grandstander and Nunito as self-hosted fonts.
- **Design references:** `apps/public/DESIGN.md` and `apps/public/.impeccable/design.json` (normative visual system), `design/mockups/` (the mockup, design sheet and font alternates, with the provided art in `design/mockups/assets/`).
- **Other changes:** needs the feature changes (not yet written) that store the images and create the public pages; this change styles and extends those pages.

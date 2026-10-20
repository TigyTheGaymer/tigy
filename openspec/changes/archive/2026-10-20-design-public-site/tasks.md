# Tasks

Build order: this change styles and extends the public pages that the archived feature changes created (`define-data-model` for the data, `add-public-pages` for the home, artwork and not-found pages). `apps/public/DESIGN.md` is the normative visual system; the mockup in `design/mockups/` (`index.html`, `detail.html`, `design-sheet.html`) is the reference for look and behaviour, and design D10 records where the build departs from it. Run tasks through Nx (`npx nx ...`), and keep the `public-pages` end-to-end suite passing, updating its selectors where the markup changes.

## 1. Foundations

- [x] 1.1 Self-host Grandstander and Nunito in `apps/public` and set up the colour, type, corner and shadow tokens from DESIGN.md for the light and dark themes; also self-host and declare Fredoka and Sour Gummy without using them (D10); verify on a test page that every token resolves in both themes, no font is loaded from a third-party host, and the unused alternates are never downloaded
- [x] 1.2 Build the theme switch (Automatic, Light, Dark; stored in the browser) with a small inline script that applies the stored theme before first paint, while the server renders without a theme attribute; the same script applies the stored credits-panel state for task 4.3; verify with a test of the cycling and, on the SSR build, that reloading with Dark stored shows no light flash
- [x] 1.3 Add `@ng-icons/lucide` for interface icons and a social-link component that shows the four Simple Icons SVGs (Bluesky, Telegram, Twitter bird, Fur Affinity, with their source and licence noted) or Lucide's link icon for any other network, with the handle and a "Network: handle" accessible name; verify each logo and the fallback render in the text colour in both themes
- [x] 1.4 Add the custom markings (forehead mark, flank stripes, paw print) as reusable pieces; verify they render as in `design/mockups/design-sheet.html`

## 2. Site chrome

- [x] 2.1 Build the sticky top bar (forehead mark and wordmark, theme button, "Show NSFW" switch with the paw thumb) and remove any footer; verify against the spec scenarios "No footer" and "Choosing Dark", and with keyboard-only use of both controls
- [x] 2.2 Render the owner's social links from `/api/home` (`HomeResponse.owner.links`, read from `people/tigy`) with the social-link component, icon-only on phones; verify the spec scenarios "Wide screen" and "Phone" for social links, including with a screen reader name check

## 3. Home page

- [x] 3.1 Build the open home header (animated avatar, name, the bio "A tiger" fixed in the page, piece count and date range, social links) straight on the page; verify the spec scenario "Visitor opens the home page" on a phone and on a desktop screen
- [x] 3.2 Implement the justified row layout in CSS (D11: target heights 340/270/200px, rows never below 75% of the target, pieces whole at their own aspect ratio on the cream backdrop), with unit tests of the tile sizing, and render the gallery with it; verify the spec scenarios "Tall comic" and "Transparent sticker" and that the server-rendered first page does not jump on hydration
- [x] 3.3 Render the gallery as one continuous run, newest first, without year or month headings, with the tile hover (lift, title label, paw prints); verify the spec scenario "Pieces from several years"
- [x] 3.4 Replace the "Load more" button from `add-public-pages` with automatic loading of the next page near the end of the gallery, plus the end message; verify the `public-pages` scenarios "Loading more" and "The address stays shareable" with a test that no piece is skipped or repeated
- [x] 3.5 Keep the loaded pieces and scroll position in memory for the visit and restore them when going back with the page's back control or the browser's; the page's back control goes back in history when the visitor came from the gallery, and otherwise opens the remembered gallery address or home (D10); verify the spec scenarios "Back from a piece" and "Reloading the gallery"
- [x] 3.6 Add the matching pieces' counts per year to `/api/gallery` with server tests; build the scroll timeline (ringed tail over the whole filtered gallery, year marks from those counts, click and drag, loading pages until a chosen year arrives) beside the browser scrollbar, and the bottom progress bar on phones; verify the spec scenarios "Dragging the timeline", "Filtered gallery" and the phone progress bar
- [x] 3.7 Build the filter row sticking under the top bar: the active filters as removable chips, a newest/oldest sort chip, and the four pickers (Characters, Artists, Tags, Year) as inert controls marked "coming later"; verify the spec scenarios "Removing a filter chip" and "Pressing a picker" and the `public-pages` scenarios for filters from the address

## 4. Artwork page

- [x] 4.1 Build the viewer layout: full-height dark stage with the piece, a top bar with back, logo, theme button, NSFW switch, share, full view, credits and download; verify on a phone and a desktop screen in both themes
- [x] 4.2 Add previous/next through buttons, arrow keys and swipe, and Escape back to the gallery; verify the spec scenarios "Arrow key", "Swipe on a phone" and "First piece"
- [x] 4.3 Build the flat credits panel (title, description, date or "Added" with the day added, artists and characters with their social links, tags, original file, and "Copy safe link" on NSFW pieces), beside the stage on wide screens, open by default and closable with the closed state remembered and applied before first paint, and below the stage at 1100px and narrower; verify the spec scenarios "Wide screen", "Closed panel is remembered", "Piece with only an image" and "Safe link of an NSFW piece", and the `public-pages` scenario "Piece without a date"
- [x] 4.4 Build the full view: it opens on `full.webp` and swaps in the original once loaded, with zoom in and out, fit, drag, pinch and Escape to close; verify the spec scenarios "Zooming into a reference sheet", "Opening before the original arrives" and "Closing"
- [x] 4.5 Add sharing of the piece's link through the share sheet, with a copy-and-confirm fallback; verify the spec scenario "Desktop without a share sheet"
- [x] 4.6 Style the NSFW confirm and not-found screens as plain panels on the stage; verify the `public-pages` NSFW and not-found scenarios still pass

## 5. Integration checks

- [x] 5.1 Compare the built pages with the mockup on a phone (375px) and a desktop (1440px) in both themes, and fix differences; verify with side-by-side screenshots and no horizontal overflow
- [x] 5.2 Run an accessibility and quality pass (keyboard order, focus rings, contrast in both themes, reduced motion, impeccable's detector) and fix the findings; verify the detector reports no findings beyond the accepted advisories (striped tail, springy easing)
- [x] 5.3 Update `apps/public/DESIGN.md`, its `.impeccable/design.json` and `apps/public/README.md` for anything the build changed, including the D10 decisions (no month bubble, live filter and sort chips, the safe-link button, the remembered credits panel, the unused alternate fonts); verify the design sheet and DESIGN.md still match the built site

## Workflow follow-up

- Archive this change once built; its `public-pages` and `gallery-catalog` deltas modify requirements the archived feature changes created.

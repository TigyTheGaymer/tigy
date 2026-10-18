# Tasks

Build order: this change styles and extends the public pages that the feature changes create (`define-data-model` for the data, `add-public-pages` for the home and artwork pages), so it is implemented after them. `apps/public/DESIGN.md` is the normative visual system; the mockup in `design/mockups/` (`index.html`, `detail.html`, `design-sheet.html`) is the reference for look and behaviour. It replaces any plain paging placeholder those changes leave.

## 1. Foundations

- [ ] 1.1 Self-host Grandstander and Nunito in `apps/public` and set up the colour, type, corner and shadow tokens from DESIGN.md for the light and dark themes; verify on a test page that every token resolves in both themes and no font is loaded from a third-party host
- [ ] 1.2 Build the theme switch (Automatic, Light, Dark; stored in the browser) with a small inline script that applies the stored theme before first paint, while the server renders without a theme attribute; verify with a test of the cycling and, on the SSR build, that reloading with Dark stored shows no light flash
- [ ] 1.3 Add `lucide-angular` for interface icons and a social-logo component holding the four Simple Icons SVGs (Bluesky, Telegram, Twitter bird, Fur Affinity) with their source and licence noted; verify each icon and logo renders in the text colour in both themes
- [ ] 1.4 Add the custom markings (forehead mark, flank stripes, paw print) as reusable pieces; verify they render as in `design/mockups/design-sheet.html`

## 2. Site chrome

- [ ] 2.1 Build the sticky top bar (forehead mark and wordmark, theme button, "Show NSFW" switch with the paw thumb) and remove any footer; verify against the spec scenarios "No footer" and "Choosing Dark", and with keyboard-only use of both controls
- [ ] 2.2 Read the owner's social links (network, handle, address) from `people/tigy` through the home header data that `define-data-model` serves, and render them with logos and handles, logo-only on phones, each with a "Network: handle" accessible name; verify the spec scenarios "Wide screen" and "Phone" for social links, including with a screen reader name check

## 3. Home page

- [ ] 3.1 Build the open home header (animated avatar, name, short bio, piece count and date range, social links) straight on the page; verify the spec scenario "Visitor opens the home page" on a phone and on a desktop screen
- [ ] 3.2 Implement the justified row layout (target heights 340/270/200px, never below 75% of the target, pieces at their own aspect ratio, transparent pieces on a backdrop) as a pure function with unit tests, and render the gallery with it; verify the spec scenarios "Tall comic" and "Transparent sticker" and that the server-rendered first page does not jump on hydration
- [ ] 3.3 Render the gallery as one continuous run, newest first, without year or month headings, with the tile hover (lift, title label, paw prints); verify the spec scenario "Pieces from several years"
- [ ] 3.4 Replace the "next page" link with automatic loading of the next 24 pieces near the end of the gallery, plus the end message; verify the spec scenarios "Scrolling near the end" and "Everything loaded" with a test that no piece is skipped or repeated
- [ ] 3.5 Restore the loaded pages and scroll position when returning from an artwork page; verify the spec scenario "Back from a piece"
- [ ] 3.6 Build the scroll timeline (ringed tail with year marks, month bubble, click and drag) beside the browser scrollbar, and the bottom progress bar on phones; verify the spec scenarios "Dragging the timeline" and the phone progress bar
- [ ] 3.7 Add the filter row (Characters, Artists, Tags, Year) as inert controls marked "coming later", sticking under the top bar; verify the spec scenario "Pressing a filter"

## 4. Artwork page

- [ ] 4.1 Build the viewer layout: full-height dark stage with the piece, a top bar with back, logo, theme button, NSFW switch, share, full view, credits and download; verify on a phone and a desktop screen in both themes
- [ ] 4.2 Add previous/next through buttons, arrow keys and swipe, and Escape back to the gallery; verify the spec scenarios "Arrow key", "Swipe on a phone" and "First piece"
- [ ] 4.3 Build the flat credits panel (title, description, date, artists, characters with their links, tags, original file), beside the stage and closable on wide screens, below it at 1100px and narrower; verify the spec scenarios "Wide screen" and "Piece with only an image" for the credits panel
- [ ] 4.4 Build the full view with zoom in and out, fit, drag, pinch and Escape to close; verify the spec scenarios "Zooming into a reference sheet" and "Closing"
- [ ] 4.5 Add sharing through the share sheet, with a copy-and-confirm fallback; verify the spec scenario "Desktop without a share sheet"
- [ ] 4.6 Style the NSFW confirm and not-found screens as plain panels on the stage; verify the NSFW scenarios from the feature changes still pass

## 5. Integration checks

- [ ] 5.1 Compare the built pages with the mockup on a phone (375px) and a desktop (1440px) in both themes, and fix differences; verify with side-by-side screenshots and no horizontal overflow
- [ ] 5.2 Run an accessibility and quality pass (keyboard order, focus rings, contrast in both themes, reduced motion, impeccable's detector) and fix the findings; verify the detector reports no findings beyond the accepted advisories (striped tail, springy easing)
- [ ] 5.3 Update `apps/public/DESIGN.md`, its `.impeccable/design.json` and `apps/public/README.md` for anything the build changed; verify the design sheet and DESIGN.md still match the built site

## Workflow follow-up

- Archive this change after the feature changes that create the public pages, so its requirements land on top of theirs.
- The credits panel shows real artists and characters once `define-data-model` is built.

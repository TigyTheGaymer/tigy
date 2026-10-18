# Design

## Context

See proposal.md for motivation and scope. The public site's data and behaviour will be defined by feature changes written from scratch after this mockup; none exist yet. This document started as the brief for the mockup round; the round is finished and the owner chose **Tigy's Album** (D9). It now records that design and the decisions behind it. The visual system itself is normative in `apps/public/DESIGN.md`.

Constraints the mockup was designed under. They came from earlier feature changes that were removed, so the new feature changes confirm or replace them:

- **Server-rendered, CDN-cached pages**: every page arrives as complete HTML, and that first HTML is always the NSFW-hidden view. The visitor's NSFW choice is applied in the browser after load.
- **The gallery pages 24 images at a time**, newest first. How further pages load (pages, a "load more" button, infinite scroll) is open for the design.
- **Artwork comes in any aspect ratio**: tall reference sheets, wide scenes, square icons and badges, and animated GIF/APNG/WebP. The gallery and detail page must handle all of them.
- **Images without a date** sort by the day they were added, so the design should not assume every image shows a date.

## Goals / Non-Goals

**Goals:**
- Build Tigy's Album into `apps/public` as `apps/public/DESIGN.md` specifies, matching the mockup in behaviour and look.
- Phone first: most visitors open shared links from social apps.
- Keep the server-rendered, CDN-cached, SFW-first pages intact; nothing the design adds in the browser may shift the layout or flash the wrong theme.

**Non-Goals:**
- The person and tag pages, and working filters. They follow this design later.
- The data model for artworks, people and tags; it is defined in the `define-data-model` change (see "Data model" below).
- Final copy or real credits; the mockup's placeholders stay placeholders until real content exists.

## Decisions

### The brief

**Audience and arrival.** Visitors are the owner's followers and friends and the artists who drew the pieces. Most arrive from a link in a social post, landing on the home page or straight on one artwork's page, often on a phone. They come to look at the art, see who made it, and find the owner's other socials.

**What the site is.** A showcase of art of Tigy, the owner's fursona, much of it commissioned, and a contact hub that links to the owner's socials. One owner, many artists. Many pieces show other people's characters alongside Tigy.

**Home page (D1).** It opens with an intro to Tigy (a piece of art, the name, a one-line bio) and the owner's social links, with the gallery of published art sorted by date directly below. The gallery is the main content; the intro must not push it far down on a phone.
- *Why:* visitors from a social post get who Tigy is, where to find the owner and the art in one screen.
- *Alternative:* a plain gallery home with a separate About page (one more page to design, and the socials sit one click away).

**Socials in the home header only (D2).** The owner's social links sit in the home header. There is no footer: the owner removed it during the round, so the artwork page links back to the home page (the logo and the back button) instead of repeating the socials. *Supersedes the earlier "socials on every page".*

**Artwork detail page (D3).** It carries:
- the image at page size, opening a **fullscreen view with zoom and pan** for detailed pieces;
- **previous/next** in gallery date order, with arrow keys and swipe;
- title, **artists** (each with links), **characters** (each with its links), **tags**, date, description, each only when set;
- **download** of the original file;
- **share** (the phone's share sheet) or copy link;
- **back to the gallery**, returning to where the visitor was scrolled.

There is no section for other versions of a piece: `define-data-model` drops sets, so a clean and an NSFW version of a piece are two separate artworks. The mockup's "Set" section was removed with it.

**NSFW (D4).** A "show NSFW" switch, off by default and remembered in the browser, lives in the site chrome. With it off, NSFW images are left out of every list. A direct link to an NSFW image shows a confirm screen without the image until the visitor confirms or turns the switch on. The switch lives in the top bar, and the confirm screen is a plain panel on the artwork page's stage. Hidden images are left out entirely. How a shared artwork link previews (the real title and image by default, NSFW included; a generic card with the safe link), what the confirm screen's first HTML carries, and `noindex` on NSFW pages are defined in `define-data-model` (its D6).

**Content for the mockups (D5).** The mockups use the real art the owner provided (below). Anything not provided (artist names and links, the other character's name and links, the owner's social links) is a clearly marked placeholder, never an invented name, link or bio. The data is a small JavaScript array shaped like the image entries (title, date, nsfw, description, tags, artists and characters with links), so every page renders the same content.

**The provided art.** Five pieces, shared by the owner in this change's discussion and saved on the owner's machine under `C:\Users\phong\.claude\uploads\f15fb155-dcd5-43a3-bf39-04247839cba9\`. The mockup copies them into `design/mockups/assets/`, together with web-sized versions of the two large pieces, and they are committed there so the mockup works from the repository.

| File | Piece | Shape | What it tests |
|---|---|---|---|
| `0b97227b-image.png` | Chibi Tigy sitting | 512×512, transparent | Sticker-style art without a background |
| `57fe542c-image.png` | Three-panel comic: Tigy and a dog character ("Hey Pookie!") | ~1530×2000, portrait | Reading a comic with text; a cropped thumbnail cuts its panels; a multi-character credit with another person as a character |
| `fda93f14-image.png` | Tigy with hearts | 512×512, transparent | Sticker-style art, same as above |
| `13dcf1c9-image.png` | Tigy reference sheet | ~2000×1217, landscape | Zoom and pan on a detailed piece; the natural "who is Tigy" piece |
| `77aac42b-image.gif` | Tigy portrait | 560×560, animated GIF (27 frames) | The animated state: playing in the gallery, the detail page and as an avatar |

What the art meant for the design:
- **Transparent stickers are a recurring kind of piece.** Gallery tiles and the detail view cannot assume an image fills its box; the design needs a backdrop that works behind cut-out art (cream behind thumbnails, the dark stage behind the open piece).
- **Aspect ratios run from 1:1 to tall portrait to wide landscape** in just four pieces. The gallery's cropping or fitting choice must keep comics and ref sheets readable as thumbnails.
- **Tigy's own colours** are tiger orange, cream, deep maroon stripes and pink nose and pads, with ivy green in the ref sheet. The chosen design draws its whole palette from them.
- **Real bio material:** the ref sheet lists Tigy's interests as gaming, plants and photography. The home intro may use these; it must not invent more.

**The mockup round and the chosen design.** The round compared a photographer's contact sheet, a die-cut sticker sheet, a multiplane animation stand, a shared photo album in the Google Photos tradition and a cute direction built from Tigy's own markings; a pixel-art game direction was discussed and not built. The owner liked the photo album and Tigy's markings, and the chosen design, **Tigy's Album**, combines them: Tigy's markings and palette on the photo album's mechanics (a justified gallery at each piece's real shape that loads as you scroll, a date timeline drawn as Tigy's ringed tail, and an artwork viewer with a credits panel), with a light theme and a maroon dark theme. It is the only design kept: `design/mockups/index.html` (home) and `detail.html` (artwork page), with the agreed system in `apps/public/DESIGN.md` and the visual summary in `design/mockups/design-sheet.html`.

Owner feedback from the round, to carry into the build:
- Thumbnails must keep each piece's real shape; square crops cut the art off.
- The gallery is one continuous run, newest first, with no grouping by year or month.
- The logo mark is Tigy's forehead marking (one long stroke crossed by two shorter ones), next to the "Tigy" wordmark. Alternatives were compared and not chosen: a paw, stripes, the wordmark alone, and three takes on Tigy's one tooth.
- Corners use three steps: 6px for tags, badges and labels; 8px for gallery tiles, the artwork, thumbnails, buttons, dropdowns, chips and icon buttons; 16px for panels. Only faces, the tail and the paw thumb are fully round. The ears were tried and removed.
- Display font: Grandstander for now, with Fredoka and Sour Gummy kept as alternates (both have a standard lowercase "g"); compared in `design/mockups/fonts.html`.
- Filters are future work. Their planned place is a row of chips (Characters, Artists, Tags, Year) between the gallery heading and the grid, sticking under the top bar while scrolling; each chip opens a picker (a dropdown on desktop, a bottom sheet on phones), active filters show as removable chips, and the URL carries the filters. The mockup shows the row as design only. How filters combine, sort and page is defined in `define-data-model` (its D5).

**The reference sheet is SFW (D7).** The owner does not flag it NSFW, so it may serve as the home intro piece and appear in link previews. To show the NSFW states (confirm screen, switch on and off), the mockups mark one of the other pieces NSFW for the mockup only, labelled so it is not mistaken for a real flag.

**Credits stay placeholders (D8).** The owner chose not to supply artist names, links or the comic's other character for the mockup round. Credits are clearly marked placeholders shaped like real ones (one or more artists and characters, each with links), which is enough to judge the layout.

**The chosen design, Tigy's Album (D9).** Tigy's coat on a photo album. The normative description is `apps/public/DESIGN.md`; these are the decisions that shape the build.
- **Header:** open, straight on the page, no card: the animated avatar, the name with the forehead mark, "A tiger", the piece count and date range, the social links.
- **Social links:** Simple Icons logos in the text colour with the handle; logo-only 46px buttons on phones, with "Network: handle" as the accessible name. Twitter uses the bird logo.
- **Gallery:** justified rows at each piece's real shape, newest first, one continuous run. Target row height 340px on desktop, 270px on tablets and 200px on phones; a row never squeezes a piece below 75% of the target, so on phones wide and square pieces get a row of their own. Pages of 24 load automatically when the end of the gallery is within 300px of the screen; returning from an artwork restores the loaded pages and the scroll position. Hovering a tile lifts it, shows its title and walks three paw prints up its corner.
- **Tail timeline:** a ringed tail on the right edge (desktop) that fills with scroll progress, marks where each year starts, shows the month while hovering, and scrolls when dragged or clicked. It sits beside the browser's scrollbar, not instead of it. On phones it is a thin ringed bar along the bottom.
- **Artwork page:** a full-height dark stage with the piece and previous/next arrows, and a top bar with back, the logo, the theme button, the NSFW switch, share, full view, credits and download. The credits panel is a flat 380px side panel, open by default on wide screens and below the stage at 1100px and narrower. Escape returns to the gallery; arrow keys and swipe move between pieces.
- **Theme switch:** Automatic, Light and Dark, cycled by one button and remembered in the visitor's browser. Light is the fur-orange page; dark is the stripe-maroon page with fur as the accent. Because pages are CDN-cached server HTML, the stored choice is applied by a small inline script before first paint, and the server renders without a theme attribute.
- **Filter row:** design only, marked "coming later"; the planned behaviour is under the owner feedback above.
- **Icons:** Lucide only for interface icons; Simple Icons for social logos; the forehead mark, paw print and stripes are custom drawings.

**Content ranges.** The number of published images is not confirmed. The design must hold up with about 10 images and with several hundred. Credits range from one artist and only Tigy up to several artists and four or more characters on one piece. Titles, descriptions and tags may all be missing.

**States to show.** Gallery loading the next page; an artwork with every field filled and one with only the image; an animated image; a transparent sticker; the NSFW confirm screen; NSFW switch on and off. With four real pieces, a gallery of several hundred is shown by repeating them, marked as such.

**Deliverable layout (D6).** After the round, `design/mockups/` holds only the chosen design: `index.html` (home) and `detail.html` (artwork page) with their `style.css` and `app.js`, the shared content and behaviour in `shared/`, `design-sheet.html` (the visual summary), `fonts.html` (the display font and its alternates) and the art in `assets/`. The other directions were removed. `node design/mockups/serve.mjs` serves them at http://localhost:4321; there is no build step, and nothing lives in the Nx projects.

### Data model

Defined in the `define-data-model` change, which supersedes the notes this section used to hold. Its `gallery-catalog` spec and design are the reference for how artworks, people and tags are stored and how the gallery filters, sorts and pages; this change only shows that data.

## Risks / Trade-offs

- [Placeholder credits make the detail page hard to judge] → the art is real (D5), and the placeholders keep the shape and length range of real credits (D8).
- [The design fights the server-rendered, SFW-first loading, for example the gallery visibly swapping when the NSFW switch is on] → the switch-on gallery loads after hydration, which accepts the swap.
- [The gallery layout, tail timeline and theme run in the browser after server rendering, so the first paint could jump or flash] → the server renders the gallery rows at a default width or reserves their space, and the theme is applied by an inline script before first paint (D9).
- [Current Simple Icons releases no longer ship the Twitter bird] → the four logos are copied SVGs, so the bird stays as it is.

## Open Questions

- Context-aware previous/next (for example "next by this artist" when the visitor came from an artist's page) and a "more by this artist" row on the detail page. Both were deferred and can be added later.

# Proposal

## Why

`define-data-model` (archived) serves the gallery's data, and `design-public-site` styles the public pages, but no change creates those pages: the public app is still the Angular scaffold. This change builds the home and artwork pages as plain, unstyled pages on top of the data endpoints, so the data model can be verified end to end and the design has real pages to style.

## What Changes

- **Routes.** `/` is the home page with the gallery, `/i/{id}` is an artwork's page, and every other address renders a not-found page with HTTP 404. People and tags never get pages of their own: people are credits and tags are gallery filters, and Tigy is the home page.
- **Home page.** The home header (Tigy's name, avatar and social links, the piece count and date range) and the first page of the gallery, server-rendered. "Load more" appends the next page without changing the address, so a shared link always starts at the top; `design-public-site` later turns it into automatic loading. The page size is one constant shared with the data endpoints. With no art yet the page says so.
- **Filters from the address.** The gallery reads its filters and sort from the URL. The page names each active filter (people by name, or "Unknown person") as a link that removes it, offers newest and oldest first, and every credit and tag on an artwork page links to the gallery filtered by it. There are no filter pickers yet; they come with `design-public-site`'s filter row.
- **Artwork page.** The piece, its title, description, date, credits in order (Tigy's credit links home), tags, original file details with a download named after the title, previous and next, and a link back to the gallery the visitor came from.
- **NSFW in the browser.** A plain "Show NSFW" switch, off by default and remembered in the browser. With it on, the page shows the SFW view at once and swaps in the NSFW-inclusive lists. An NSFW artwork opened with the switch off shows its details behind a confirm screen; "Show this piece" reveals the image and is remembered for that piece for the browser session.
- **Titles, previews and search.** Every page's title is "Tigy". Artwork pages carry their real title and full image for link previews; a `?safe` variant, the home page and the not-found page carry a small site card with Tigy's avatar. NSFW artwork pages and their image files are never indexed, `robots.txt` keeps crawlers out of `/api/`, and `/sitemap.xml` lists the home page and every published SFW artwork.
- **Images and avatars from the site's own address.** Thumbnails, full images and originals are served at `/img/{id}/{file}`, cached for 10 minutes at the CDN so a deleted piece disappears in time. Each person may have one square avatar, stored at `people/{id}/avatar.webp` and served at `/avatars/{id}.webp`.
- **Data services.** Angular services fetch the endpoints with `HttpClient`, so the same code runs during server rendering and in the browser, and the browser reuses the server's responses when it hydrates.
- **End-to-end tests.** A Playwright suite checks the pages against the built server and the seeded emulators, and runs in CI's gate before every deploy that affects the public site.
- **Takes over from `define-data-model`:** its former tasks 4.5 and 4.6 and the page checks of 5.1 and 5.2.

## Capabilities

### New Capabilities

- `public-pages`: the public site's routes and what each page shows and does before styling: the home page with its gallery, loading more and filters from the address, the artwork page, the NSFW switch and confirm screen, the not-found page, titles, link previews, crawling rules and the sitemap, and how images and avatars are served.

### Modified Capabilities

- `gallery-catalog`: people have no pages of their own, so "People and artworks are addressed by ID" covers person filters and artwork addresses only, and "Tigy is the site's own person" no longer mentions a person page address.

## Impact

- **Public app (`apps/public`):** routes, the home, artwork and not-found pages, data services, the NSFW switch, head metadata, the image and avatar routes, `robots.txt` and the sitemap in `server.ts`, and page-level cache headers.
- **End-to-end tests:** a new Playwright project (`apps/public-e2e`) and the `@playwright/test` dev dependency; CI installs its browser and runs `e2e` in the gate before deploying.
- **Storage:** a rule that lets anyone fetch, but not list, `people/{id}/avatar.webp`, with rules tests; the public server reads files with the Admin SDK.
- **Seed:** the emulator seed uploads Tigy's avatar to its own path.
- **Other documents:** `PRODUCT.md` lists the public pages as home, artwork and not found. `design-public-site` stops planning person and tag pages, and its task 3.4 turns the "Load more" button into automatic loading.

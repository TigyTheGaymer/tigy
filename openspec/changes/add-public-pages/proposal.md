# Proposal

## Why

`define-data-model` serves the gallery's data, and `design-public-site` styles the public pages, but no change creates those pages: the public app is still the Angular scaffold. Both changes defer to page changes "not yet written", and `define-data-model` cannot finish its page-level tasks (4.5, 4.6 and the page checks in section 5) without them. This change builds the home and artwork pages as plain, unstyled pages on top of the data endpoints, so the data model can be verified end to end and the design has real pages to style.

## What Changes

- **Routes.** `/` is the home page with the gallery, `/i/{id}` is an artwork's page, and every other address renders a not-found page with HTTP 404. Person and tag pages come later.
- **Home page.** The home header (Tigy's name, avatar and social links, the piece count and date range) and the first 24 pieces of the gallery, server-rendered. A "next page" link continues after the last piece shown, and the page says when the end is reached. `design-public-site` replaces the link with automatic loading.
- **Filters from the address.** The gallery reads its filters and sort from the URL. The page names each active filter (people by name) as a link that removes it, offers newest and oldest first, and every credit and tag on an artwork page links to the gallery filtered by it. There are no filter pickers yet; they come with `design-public-site`'s filter row.
- **Artwork page.** The piece, its title, description, date, credits in order (Tigy's credit links home), tags, original file details with a download link, previous and next, and a link back to the gallery.
- **NSFW in the browser.** A plain "Show NSFW" switch, off by default and remembered in the browser. With it on, the lists reload with NSFW pieces after the page loads. An NSFW artwork opened with the switch off shows its details behind a confirm screen, and the image only once the visitor confirms or turns the switch on.
- **Link previews and search.** Artwork pages carry their real title and image for link previews, a `?safe` variant carries a generic site card, NSFW artwork pages are never indexed, and `robots.txt` keeps crawlers out of `/api/`. NSFW artwork pages also offer the safe link.
- **Images from the site's own address.** Thumbnails, full images and originals are served through the public server at `/img/{id}/{file}`, so the CDN caches them (the owner's decision after spike S2).
- **Data services.** Angular services fetch the endpoints with `HttpClient`, so the same code runs during server rendering and in the browser, and the browser reuses the server's responses when it hydrates.
- **Takes over from `define-data-model`:** its tasks 4.5 and 4.6, and the page checks of its tasks 5.1 and 5.2, move into this change.

## Capabilities

### New Capabilities

- `public-pages`: the public site's routes and what each page shows and does before styling: the home page with its gallery, paging and filters from the address, the artwork page, the NSFW switch and confirm screen, the not-found page, link previews, crawling rules and how images are served.

### Modified Capabilities

- None. (`gallery-catalog` and `public-gallery` are still deltas inside the in-flight changes `define-data-model` and `design-public-site`; this change implements several `gallery-catalog` requirements on the pages without changing them.)

## Impact

- **Public app (`apps/public`):** routes, the home, artwork and not-found pages, data services, the NSFW switch, head metadata, an image route in `server.ts`, `robots.txt`, and page-level cache headers.
- **Storage:** the public server reads image files with the Admin SDK; Storage rules are unchanged.
- **Other changes:** `define-data-model` points its tasks 4.5, 4.6 and the page checks of 5.1 and 5.2 to this change. `design-public-site` styles these pages; its build order and task 3.4 ("replace the next page link") already expect them, and its inert filter row sits beside the active-filter chips this change adds.

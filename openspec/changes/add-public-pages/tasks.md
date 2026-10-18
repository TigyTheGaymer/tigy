# Tasks

Build order: this change needs the endpoints from the archived `define-data-model` and comes before `design-public-site`, which styles these pages. Run tasks through Nx (`npx nx ...`). Each group adds its scenarios to the end-to-end suite from task 1.3, which runs the built server against the seeded emulators.

## 1. Foundations

- [x] 1.1 Add the routes `/`, `/i/:id` and `**` with lazily loaded page components, a not-found page that sets status 404 and links home, the title "Tigy" on every page, and `Cache-Control: public, max-age=0, s-maxage=300` on every page response (design P1, P4, P6); verify with component tests
- [x] 1.2 Add `CatalogService` with typed `httpResource`s for the four endpoints and a server-only HTTP backend that sends `/api/` requests to the server's own port (design P2); verify with unit tests using `HttpTestingController`, and that the backend rewrites only `/api/` URLs
- [x] 1.3 Add the Playwright project `apps/public-e2e` with the Nx Playwright plugin and an `e2e` target that seeds the emulators and runs the built server against them with `SUMMARY_MAX_AGE_MS` overridable, marked not to run in parallel with the other emulator tests; add Chromium installation and `e2e` to CI's gate, and document the command in the README (design P12); verify with the first scenarios, "Unknown address", "Unpublished artwork link", "Cache header on a page" and the not-found page's title, passing locally

## 2. Home page

- [x] 2.1 Render the home header (name, avatar from `/avatars/{id}.webp`, social links, count and date range) and the first page of tiles linking to `/i/{id}`, each thumbnail with `width` and `height` from its row, with the fallbacks for a missing Tigy and "No art yet." (design P7); verify with component tests and the e2e scenarios "Visitor opens the home page" and "No art yet"
- [x] 2.2 Add "Load more", appending the next page from `/api/gallery` with `after` and `PAGE_SIZE`, and the end message (design P8); verify with a component test and the e2e scenarios "Loading more" and "The address stays shareable"
- [x] 2.3 Read the filters and sort from the address, name each active filter (people from `/api/people`, read only when a person filter is active, or "Unknown person") with a link that removes it, offer newest and oldest first, and show "nothing matches" with a clear link; verify with the e2e scenarios "Shared filtered link", "Removing a filter", "Unknown person" and `gallery-catalog`'s "No matches"

## 3. Artwork page

- [x] 3.1 Render the piece, title or "Untitled", description, date at its precision, credits in order (Tigy's linking home, others to `/?artist=` or `/?character=`), tags linking to `/?tag=`, original file details, the download link, previous and next; render not found for an unpublished or missing piece; verify with component tests and the e2e scenarios "Piece with every field", "Following an artist's credit", and `gallery-catalog`'s "Year only", "Piece without credits" and "Tigy credited as a character"
- [x] 3.2 Add the link back from the gallery address stored per tab (design P9); verify with the e2e scenarios "Back to a filtered gallery" and "Arriving from a shared link"
- [x] 3.3 Set the head metadata from the artwork, the site card with `?safe` and on the home and not-found pages, `noindex` on every NSFW piece, and the safe link on NSFW pages (design P4); verify with the e2e scenarios "Safe link to an NSFW piece", "Title of an NSFW piece" and `gallery-catalog`'s "Default link to an NSFW piece"

## 4. NSFW

- [x] 4.1 Add the NSFW switch, stored in `localStorage` with a guard for browsers that refuse storage, off on the server; with it on, swap in the NSFW-inclusive gallery and neighbours after load (design P3); verify with unit tests for the stored choice and the e2e scenarios "Turning the switch on", "Switch already on" and `gallery-catalog`'s "Switch off"
- [x] 4.2 Add the confirm screen for NSFW pieces with the switch off: details shown, no `<img>`, "Show this piece" reveals the image without a request and is remembered per piece in `sessionStorage`, "Show NSFW everywhere" turns the switch on (design P3); verify with the e2e scenarios "Confirming one piece", "Coming back to a confirmed piece" and `gallery-catalog`'s "Opening an NSFW link with the switch off"

## 5. Files and crawling

- [x] 5.1 Add `/img/:id/:file` to `server.ts`, streaming `thumb.webp`, `full.webp` or `original.{ext}` from Storage with `Cache-Control: public, max-age=86400, s-maxage=600`, `X-Robots-Tag: noindex` for NSFW pieces and the original as an attachment named after the title (design P5); verify with `test-server` tests against a fake bucket and the e2e scenarios "Thumbnail of a piece" and "Download name"
- [x] 5.2 Add avatars: the Storage rule for `people/{id}/avatar.webp` with rules tests (fetchable, not listable, owner-only writes), `/avatars/:id.webp` in `server.ts`, and Tigy's avatar in the seed (design P10); verify with `npx nx test firebase`, `test-server` tests and the e2e scenario "Tigy's avatar"
- [x] 5.3 Serve `/robots.txt` (`Disallow: /api/`, the sitemap's absolute address) and `/sitemap.xml` from the cached summary (design P11); verify with `test-server` tests and the e2e scenarios "Search engines" and "Sitemap contents"

## 6. Integration

- [ ] 6.1 Add the e2e scenarios that span the pages: "Hydration" (no `/api/` request while an artwork page becomes interactive), and, with the summary cache shortened, `gallery-catalog`'s "Editing a person", "Owner edits a social link", "Renaming a person", "Publishing later" and "Deleting a published artwork" (its files return 404); verify the whole suite passes locally and in CI
- [ ] 6.2 After deploying, check on the live site that an artwork page's `og:image`, the sitemap's addresses and `robots.txt`'s sitemap line use the public host, and that `/avatars/tigy.webp` loads once Tigy has an avatar; record the result here

## Workflow follow-up

- Archive before `design-public-site`, which styles these pages.

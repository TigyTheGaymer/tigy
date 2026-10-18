# Tasks

Build order: this change needs the endpoints from `define-data-model` (done) and comes before `design-public-site`, which styles these pages. Run tasks through Nx (`npx nx ...`); "the SSR build" means `npx nx build public` served with `node dist/apps/public/server/server.mjs` against the seeded emulators from `define-data-model` task 5.1.

## 1. Routing and data

- [ ] 1.1 Add the routes `/`, `/i/:id` and `**` with lazily loaded page components and a not-found page that sets status 404 and links home, and set `Cache-Control: public, max-age=0, s-maxage=300` on every page response (design P1, P6); verify on the SSR build for "Unknown address" and "Cache header on a page"
- [ ] 1.2 Add `CatalogService` with typed `HttpClient` calls to the four endpoints and a server-only interceptor that sends `/api/` requests to the server's own port (design P2); verify with unit tests using `HttpTestingController`, and that the interceptor rewrites only `/api/` URLs

## 2. Home page

- [ ] 2.1 Render the home header (name, avatar, social links, piece count and date range) and the first 24 tiles linking to `/i/{id}`, each thumbnail with `width` and `height` from its row (design P7); verify with a component test and on the SSR build for "Visitor opens the home page"
- [ ] 2.2 Add the next-page link carrying `after` and the end message; verify with a component test and on the SSR build for "Next page"
- [ ] 2.3 Read the filters and sort from the address, name each active filter (people from `/api/people`, read only when a person filter is active) with a link that removes it, offer newest and oldest first, and show "nothing matches" with a clear link; verify for "Shared filtered link", "Removing a filter" and `gallery-catalog`'s "No matches"

## 3. Artwork page

- [ ] 3.1 Render the piece, title or "Untitled", description, date at its precision, credits in order (Tigy's linking home, others to `/?artist=` or `/?character=`), tags linking to `/?tag=`, original file details, the download link, previous, next and the link back; render not found for an unpublished or missing piece; verify for "Piece with every field", "Following an artist's credit", "Unpublished artwork link" and `gallery-catalog`'s "Year only" and "Tigy credited as a character"
- [ ] 3.2 Set the head metadata from the artwork (title, description, `og:` and `twitter:` tags with an absolute image URL), the site card with `?safe` and on the not-found page, `noindex` on every NSFW piece, the safe link on NSFW pages, and `robots.txt` with `Disallow: /api/` (design P4); verify on the SSR build for "Safe link to an NSFW piece", "Search engines", and `gallery-catalog`'s "Default link to an NSFW piece" (moved from `define-data-model` task 4.5)

## 4. NSFW

- [ ] 4.1 Add the NSFW switch, stored in `localStorage` with a guard for browsers that refuse storage, off on the server; with it on, refetch the gallery and the artwork's neighbours with `nsfw=1` after load (design P3); verify with unit tests for the stored choice and a component test for "Turning the switch on"
- [ ] 4.2 Add the confirm screen for NSFW pieces with the switch off: details shown, no `<img>`, "Show this piece" adds the image without a request, "Show NSFW everywhere" turns the switch on; verify for "Confirming one piece" and, on the SSR build, `gallery-catalog`'s "Opening an NSFW link with the switch off"

## 5. Images

- [ ] 5.1 Add `/img/:id/:file` to `server.ts`, streaming `thumb.webp`, `full.webp` or `original.{ext}` from Storage with `Cache-Control: public, max-age=86400, s-maxage=604800`, the original as an attachment named after the title, and 404 for any other name or a missing file (design P5); verify with `test-server` tests against a fake bucket and that the pages' images load from `/img/`

## 6. Integration

- [ ] 6.1 On the SSR build with the seeded emulators, check that a filtered link's first HTML has the right first 24 pieces and names the active filters ("Shared filtered link"), that the gallery's first HTML holds no NSFW title, that an NSFW artwork renders its details behind the confirm screen without its `<img>`, and that hydration makes no second request to the data endpoints ("Hydration"); record the result here (moved from `define-data-model` task 4.6)
- [ ] 6.2 With the seeded emulators and the SSR build, check end to end that editing a person's link, renaming a person, publishing an image and deleting an image appear on the public pages after the server cache expires (`gallery-catalog`'s "Editing a person", "Owner edits a social link", "Renaming a person", "Publishing later", "Deleting a published artwork"); record the result here (moved from `define-data-model` task 5.2)
- [ ] 6.3 After deploying, check on the live site that an artwork page's `og:image` is an absolute URL on the public host and loads; record the result here

## Workflow follow-up

- Archive after `define-data-model`, and before `design-public-site`, which styles these pages.

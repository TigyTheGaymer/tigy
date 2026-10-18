# Design

## Context

See proposal.md for why. The public app (`apps/public`) is Angular 22 with server rendering (`RenderMode.Server` for every route) on App Hosting behind its CDN. `server.ts` already serves the data endpoints (`/api/gallery`, `/api/people`, `/api/artworks/:id`, `/api/home`), with response types in `apps/public/src/api/types.ts`, an in-memory summary cache, and the gallery query, URL parameters and date formatting in `@tigy/gallery`. Hydration is on (`provideClientHydration(withEventReplay())`). Storage rules allow anyone to fetch `images/{id}/{file}` but not to list. The emulator seed (`npx nx run firebase:seed`) loads the mockup's content.

## Goals / Non-Goals

**Goals:**

- Pages that meet `public-pages` and the page-level requirements of `gallery-catalog`, with plain semantic markup that `design-public-site` can style without restructuring.
- Every page complete in its first HTML, with no second fetch on hydration.
- Every page scenario guarded by an end-to-end test in CI.

**Non-Goals:**

- Person and tag pages, now or later: people are credits and tags are filters.
- Visual design, the tail timeline, automatic loading, full view, share sheet, theme, filter pickers: all `design-public-site`.
- Generating thumbnails, full images and avatars from uploads, and versioned image addresses: the upload change.

## Decisions

### P1. Routes

Angular routes: `/` (home), `/i/:id` (artwork) and `**` (not found), each a lazily loaded standalone component. The not-found page sets status 404 through `RESPONSE_INIT`. `server.ts` handles `/robots.txt`, `/sitemap.xml`, `/img/...` and `/avatars/...` before the Angular handler. Query parameters are the source of truth for filters and sort: the home page reads them with `galleryQueryFromParams` and writes links with `galleryQueryToParams` through `routerLink`'s `queryParams`. `/p/...` and tag addresses fall through to not found like any other unknown address.

### P2. Data services read the endpoints with `httpResource`

One `CatalogService` returns the four endpoints as typed `httpResource`s, which read through `HttpClient`: each takes a function of signals, reloads when they change and stays idle while it returns undefined. Angular's HTTP transfer cache (on by default with `provideClientHydration`) stores the server's responses in the page and replays them during hydration, so the browser makes no second request. On the server, a server-only `HttpBackend` rewrites `/api/...` to the server's own port on `localhost` (the port the request arrived on, which `server.ts` passes in the render context), so rendering never leaves the instance or passes back through the CDN. It is a backend rather than an interceptor because Angular runs app interceptors before the transfer cache: an interceptor would store each response under the loopback address, which the browser never asks for, and hydration would fetch everything again.

- _Alternative:_ call the catalog directly on the server and pass the result through `TransferState` by hand: two code paths and a hand-written hand-off.
- _Alternative:_ call the public address from the server: slower, and the CDN could hand the server stale data.

### P3. The NSFW switch and the confirm screen live in the browser

An `NsfwSwitch` service holds the choice in `localStorage` (guarded, since storage can throw) and exposes it as a signal; the server always renders with it off. After hydration, with the switch on, the home page refetches the gallery from its first piece with `nsfw=1` and replaces the list, and the artwork page refetches its neighbours: the SFW view shows first and is swapped. The confirm screen shows the details the server already rendered; "Show this piece" adds the `<img>` without a request and stores the piece's ID in `sessionStorage`, so the piece shows without asking for the rest of the browser session. "Show NSFW everywhere" turns the switch on.

### P4. Titles and head metadata

`<title>` is "Tigy" on every page and never changes. The artwork page sets `description`, `og:title`, `og:description`, `og:image` (absolute, `/img/{id}/full.webp` on the request's origin) and `twitter:card` `summary_large_image` from the artwork data. With `?safe`, and on the home and not-found pages, the metadata is the site card: `og:title` and `og:description` "Tigy", `og:image` `/avatars/tigy.webp`, `twitter:card` `summary`. NSFW pieces always add `<meta name="robots" content="noindex">`.

### P5. Images through the server at `/img/{id}/{file}`

`server.ts` streams `images/{id}/{file}` from Storage with the Admin SDK for `thumb.webp`, `full.webp` and `original.{ext}`, and returns 404 for any other name or a missing file. It sends `Cache-Control: public, max-age=86400, s-maxage=600`: the CDN keeps a file at most 10 minutes, so a deleted piece's files stop loading within `gallery-catalog`'s 10 minutes, and browsers keep their own copy for a day. For a piece the cached gallery summary marks NSFW it adds `X-Robots-Tag: noindex`; the original is sent as an attachment named after the row's title (lowercase, words joined by hyphens) or `tigy-{id}`, plus its extension. Both read the summary already in memory, so they cost no Firestore reads.

- _Alternative:_ a week at the CDN. Faster for faraway visitors, but a deleted piece would keep loading for up to a week; versioned addresses come with the upload change, and deletion still needs the short time.

### P6. Page caching

Every page, the sitemap and `robots.txt` send `Cache-Control: public, max-age=0, s-maxage=300`, the same as the endpoints (`CDN_CACHE_CONTROL`): pages through the server route headers in `app.routes.server.ts`, the server routes directly. A page whose data fails to load is sent with status 503 and `no-store` through `RESPONSE_INIT`, so the CDN never keeps a passing failure.

### P7. Markup for the design to style

Semantic elements and stable class names (`gallery`, `tile`, `load-more`, `credits`, `filters`, `confirm`), with no layout or colours beyond what keeps the plain page readable. Thumbnails carry `width` and `height` from the row, so the design's justified layout can use each piece's shape without measuring.

### P8. Loading more with one page size

The home page renders the first page on the server. "Load more" fetches `/api/gallery` with the same filters, sort and NSFW flag and `after` set to the last piece shown, appends the rows and keeps the address unchanged. The page size is `PAGE_SIZE` in `@tigy/gallery`, used by both the endpoint and the page; changing it is a one-line change and a deploy. Changing a filter, the sort or the switch starts again from the first piece.

- _Alternative:_ a next-page link with `after` in the address: works without JavaScript, but a shared link would start mid-gallery, against `gallery-catalog`'s D5.

### P9. The link back

When the home page renders in the browser, it stores its full address (path and query) in `sessionStorage`, which is per tab. The artwork page's link back uses that address when present and `/` otherwise; the server renders `/`, and the browser sets the stored address after hydration.

### P10. Avatars

A person's avatar is one square WebP at `people/{id}/avatar.webp` in Storage, and the person's `avatar` field holds that path when set. A Storage rule lets anyone fetch, but not list, exactly that file, and only the owner write it, with rules tests. `server.ts` serves it at `/avatars/{id}.webp` with the image caching from P5, and 404 when missing. The seed makes Tigy's from the portrait (a 512 px square crop).

### P11. Sitemap and `robots.txt`

`/sitemap.xml` lists the home page and every row of the cached gallery summary that is not NSFW, as absolute URLs on the request's origin; unpublished pieces are never in the summary. `/robots.txt` is served by `server.ts` so it can name the sitemap's absolute URL: `Disallow: /api/` and `Sitemap: {origin}/sitemap.xml`.

### P12. End-to-end tests

A Playwright project, `apps/public-e2e`, set up with the Nx Playwright plugin. Its `e2e` target runs inside `firebase emulators:exec` for Firestore and Storage: it seeds the emulators, then Playwright starts the built server (`dist/apps/public/server/server.mjs`) against them and runs Chromium through every `public-pages` scenario and the page scenarios of `gallery-catalog`, including hydration (no `/api/` request while the page becomes interactive). For the scenarios where an edit must reach the pages, the server runs with `SUMMARY_MAX_AGE_MS` set to one second, a test-only override of the summary cache that production never sets. The target does not run in parallel with the other emulator tests. CI installs Chromium and runs `e2e` in its gate with lint, test and build, so a failing scenario blocks the deploy.

- _Alternative:_ HTML checks without a browser: cheaper, but hydration would go unchecked.

## Risks / Trade-offs

- [Images are kept only 10 minutes at the edge, so faraway visitors' first loads often reach the server] → browsers keep files for a day; versioned, long-cached addresses come with the upload change.
- [The loopback request on the server adds a hop] → it stays on `localhost`, and pages are CDN-cached, so it only happens on a cache miss.
- [With the switch on, the gallery visibly swaps after load] → accepted: the first HTML must stay SFW for the shared CDN cache.
- [`og:image`, the sitemap and `robots.txt` use the request's origin, which behind a proxy could be an internal host] → App Hosting passes the public host; checked on the deployed site.
- [Some chat apps may not show WebP previews] → the upload change can add a JPEG preview file if one does.
- [The e2e suite adds a browser download and a few minutes to affected CI runs] → it runs only when the public site, its libraries or the rules change.

## Migration Plan

No data changes. The Storage rule and the pages deploy with the next push: rules in CI's first stage, the public site in its second. Rollback is an App Hosting rollout of the previous commit and a redeploy of the previous rules.

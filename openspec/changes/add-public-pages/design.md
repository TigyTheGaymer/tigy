# Design

## Context

See proposal.md for why. The public app (`apps/public`) is Angular 22 with server rendering (`RenderMode.Server` for every route) on App Hosting behind its CDN. `server.ts` already serves the data endpoints from `define-data-model` (`/api/gallery`, `/api/people`, `/api/artworks/:id`, `/api/home`), with response types in `apps/public/src/api/types.ts` and the gallery query, URL parameters and date formatting in `@tigy/gallery`. Hydration is on (`provideClientHydration(withEventReplay())`). Storage rules allow anyone to fetch `images/{id}/{file}` but not to list.

## Goals / Non-Goals

**Goals:**

- Pages that satisfy the page-level requirements of `gallery-catalog` and this change's `public-pages`, with plain semantic markup that `design-public-site` can style without restructuring.
- Every page complete in its first HTML, with no second fetch on hydration.

**Non-Goals:**

- Visual design, the tail timeline, automatic loading, full view, share sheet, theme: all `design-public-site`.
- Person and tag pages, filter pickers.
- Generating thumbnails and full images (the upload change).

## Decisions

### P1. Routes and components

`/` → home page, `/i/:id` → artwork page, `**` → not-found page, each a standalone component loaded lazily. The server sets the response status with `RESPONSE_INIT` (404 for not found). Query parameters stay the source of truth for filters, sort and the cursor: the home page reads them with `galleryQueryFromParams` and `parseCursor`, and builds links with `galleryQueryToParams` plus `after` through `routerLink`'s `queryParams`, so links work without JavaScript.

### P2. Data services call the endpoints through `HttpClient`

One `CatalogService` wraps the four endpoints with typed `HttpClient` calls. Angular's HTTP transfer cache (on by default with `provideClientHydration`) stores the server's responses in the page and replays them during hydration, so the browser makes no second request. On the server, an interceptor rewrites `/api/...` to the server's own port on `localhost`, so rendering never leaves the instance or passes back through the CDN.

- _Alternative:_ call the catalog directly on the server and pass the result through `TransferState` by hand. Avoids the loopback request, but needs two code paths and loses the transfer cache for free.

### P3. The NSFW switch lives in the browser only

A small `NsfwSwitch` service holds the choice in `localStorage` (guarded, since it can throw) and exposes it as a signal. The server always renders with it off. After hydration, when the stored choice is on, the home page and the artwork page refetch with `nsfw=1` and replace their lists or links. The confirm screen shows the details the server already rendered; "Show this piece" adds the `<img>` without a request. "Show NSFW everywhere" turns the switch on.

### P4. Head metadata from the artwork response

`Title` and `Meta` set `<title>`, `description`, `og:title`, `og:description`, `og:image` (absolute, from the request's origin) and `twitter:card` from the artwork data. With `?safe`, or for the not-found page, they carry the site card: site name, a fixed description and the site image. NSFW pieces always add `<meta name="robots" content="noindex">`. `robots.txt` is a static file in `apps/public/public` with `Disallow: /api/`.

### P5. Images through the server at `/img/{id}/{file}`

`server.ts` gets a route that streams `images/{id}/{file}` from Storage with the Admin SDK, for `file` in `thumb.webp`, `full.webp` and `original.{ext}`, and returns 404 for anything else or a missing file. It sends `Cache-Control: public, max-age=86400, s-maxage=604800`, so the CDN keeps a file for a week and browsers for a day. This follows the owner's decision after spike S2 (Storage token URLs are not edge-cached). The original is sent with `Content-Disposition: attachment` and the artwork's title as the file name.

- _Alternative:_ versioned, immutable URLs (`/img/{id}/{version}/{file}`, A14 in the old plan). Better caching, but needs a version on each image, which comes with the upload change when files can be replaced; until then a replaced file can be stale for up to a week at the edge.

### P6. Page caching

Every page response sets `Cache-Control: public, max-age=0, s-maxage=300`, the same as the endpoints (`CDN_CACHE_CONTROL`), through `RESPONSE_INIT` headers in the page components, falling back to a header set in `server.ts` for pages that set none.

### P7. Markup for the design to style

Semantic elements and stable class names (`gallery`, `tile`, `credits`, `filters`, `confirm`), no layout or colours beyond what keeps the plain page readable. Thumbnails carry `width` and `height` from the row, so the design's justified layout can use the shape without measuring.

## Risks / Trade-offs

- [A replaced image stays cached at the edge for up to a week] → files are not replaced until the upload change, which adds versioned URLs.
- [The loopback request on the server adds a hop] → it stays on `localhost`, and pages are CDN-cached, so it only happens on a cache miss.
- [With the switch on, the gallery visibly swaps after load] → accepted in `design-public-site`'s risks; the first HTML must stay SFW.
- [`og:image` uses the request's origin, which behind a proxy could be an internal host] → App Hosting passes the public host; checked on the deployed site.

## Migration Plan

No data changes. Deploy with the next push: the public site replaces the scaffold page. Rollback is an App Hosting rollout of the previous commit.

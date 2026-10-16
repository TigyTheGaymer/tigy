# Design

## Context

See proposal.md for motivation and scope. After `add-image-upload`, image entries exist in Firestore with their processed files and token URLs (A2, A13 in that change's design), and only the owner can read or write them. The public site is still the deployed scaffold on `*.hosted.app` (spike S4). The system overview and platform decisions are in `setup-gallery-platform`'s design.

## Goals / Non-Goals

**Goals:**
- Security rules are the single access gate. No public path to drafts depends on UI code behaving correctly.
- Every public page is one Firestore query with no follow-up lookups.
- Visitors anywhere load pages and web images from a nearby cache.
- A published change is visible within 5 minutes.

**Non-Goals:**
- The NSFW switch and confirm screen (`add-nsfw-handling`). Until then, public lists simply leave NSFW images out.
- Artist credit and artist pages (`add-artists`).
- Visual design and browsing controls (separate UI/UX change). Paging uses a plain "next page" link as a placeholder.

## Decisions

### Product decisions this change builds on

- **#4 An optional "set" links variants of the same piece** (e.g. clean and NSFW versions). The admin picks a set from the existing values (with autocomplete) instead of typing free text, so typos can't split a set. A set is a shared value, not a separate collection.
- **#5 Every field is optional except the image file.** Images without a date sort by the date they were added (A5).
- **#10 New images are drafts until published.** This is enforced in security rules, not just the UI.
- **#11 Free Firebase addresses for now:** the public site on App Hosting (`*.hosted.app`), the admin on Hosting (`*.web.app`). A custom domain can be added later.
- **Default:** image files are deleted when an entry is deleted.

### A3 - The public SSR reads as an anonymous visitor; server HTML is always SFW

The SSR server uses `firebase/firestore/lite`, not signed in, so the same rules apply to it as to any visitor. Server-rendered HTML always shows the SFW view. The first page's data is handed to the browser through TransferState. (`add-nsfw-handling` applies the visitor's NSFW switch in the browser after hydration, so this stays true.)

- *Why:* if the server read an NSFW cookie, the CDN would need a cached copy per cookie, so caching would stop working. Crawlers and link-preview bots only ever see server HTML, so NSFW can't leak into previews or SEO. Reading through the rules means a forgotten `published == true` filter fails safely.
- *Alternatives:* the Admin SDK on the server (bypasses rules, so every query must re-implement the gate); NSFW-aware server rendering (breaks CDN caching).

### A4 - SSR pages are cached at the CDN for 5 minutes

SSR responses carry `Cache-Control: public, s-maxage=300` (exact header values are settled during implementation). App Hosting routes every request through Cloud CDN. The docs describe no on-demand purge, so freshness is bounded by the cache time.

- *Why:* a page loads instantly from a nearby edge and a traffic spike costs almost nothing. A newly published image appears within about 5 minutes, which the owner accepted. Browser navigation after hydration reads live data, so only first loads can be stale.
- *Alternatives:* 1 minute (more renders, little gain) or 1 hour (publishing feels broken).

### A5 - Paging: 24 at a time, ordered by `sortDate` then document ID

Public lists query `published == true` and `nsfw == false`, `orderBy(sortDate desc)`, `orderBy(documentId)`, `limit(24)`, and use `startAfter` cursors.

- `sortDate` is written by the admin on every save as `date ?? createdAt`. Firestore's `orderBy` leaves out documents missing the field, so sorting by the optional `date` alone would hide undated images.
- The document-ID tiebreaker keeps the order fully stable when many images share a `sortDate`, so pages never skip or repeat images.
- The server renders page 1. Further pages are fetched from the browser.
- Required composite index here: (`published`, `nsfw`, `sortDate`, id). `add-nsfw-handling` adds (`published`, `sortDate`, id) for lists that include NSFW, and `add-artists` adds the artist-page equivalents with `artistId`.

### A14 - Web versions are served through the public site's CDN

Spike S2 showed that Storage token URLs are not edge-cached: every request goes back to Zurich (0.7-4.4 s to first byte from the US, Tokyo and Sydney, against 20-70 ms for a CDN). So visitors load `thumb.webp`, `full.webp` and `preview.jpg` from the public site instead, where App Hosting's Cloud CDN caches them near the visitor.

```
GET /img/{id}/{v}/thumb.webp | full.webp | preview.jpg      (apps/public server route)
  -> read images/{id} with firestore/lite, anonymous (rules apply, as in A3)
       not readable (draft, unknown ID) -> 404, short cache
  -> fetch the file through the doc's token URL, stream it back
       Cache-Control: public, max-age=31536000, immutable, s-maxage=86400
```

- `{v}` is a short version taken from the file's current download token. Replacing a file issues new tokens (A13), so the address changes and no cache keeps the old image. The route always serves the image's current file; `{v}` only busts caches.
- Pages, link previews (`og:image`) and the gallery use `/img` addresses. Master downloads keep the direct token URL: they are large (5-20 MB, above Cloud CDN's ~10 MB cache limit for responses without range support) and rare. The admin keeps using token URLs, since it shows drafts the route can't serve.
- Browsers keep an image for a year. The CDN keeps it for a day (`s-maxage`), which bounds how long an unpublished image is still served to new visitors. Exact values are settled during implementation.
- *Why:* first loads outside Europe drop from seconds to the CDN's tens of milliseconds, while the rules stay the only gate.
- *Alternatives:* direct token URLs everywhere (slow first loads outside Europe); Firebase Hosting in front of Storage (Hosting can only rewrite to functions and Cloud Run, not proxy Storage); public-read files behind a separate CDN (gives up A2).
- *Trade-off:* each CDN miss costs one Firestore read plus a Zurich-to-Netherlands fetch. An unpublished image can stay cached at the CDN for up to a day.

### File cleanup on delete

A second trigger in `apps/functions` (A1) runs when an image doc is deleted and removes everything under `images/{id}/` and `uploads/{id}/`. The admin only deletes the doc, so a deletion from anywhere cleans up its files.

## Risks / Trade-offs

- [Master downloads still come from Zurich, since they are too large for the CDN] → rare; the 1-year `Cache-Control` helps repeat downloads.
- [Cloud CDN does not cache responses over ~10 MB from an origin without range support, so a very long animated `full.webp` would always be fetched from Zurich] → rare; it still works, just slower. The size guard (A13) limits how large outputs get.
- [An unpublished image stays cached at the CDN for up to a day (A14)] → accepted; the same applies to anyone who saved a token URL (A2).
- [Content can be up to 5 minutes stale after publishing] → accepted (A4).
- [Until `add-nsfw-handling` lands, the page of a published NSFW image opens without a confirm screen for someone who has its link] → accepted before launch: no list, set or preview shows NSFW images, and the site is not advertised. The confirm screen lands before the launch checks in `add-artists`.

## Open Questions

- The exact `Cache-Control` header value for SSR responses (any value within the 5-minute freshness budget).

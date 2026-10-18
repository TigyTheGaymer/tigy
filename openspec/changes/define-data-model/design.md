# Design

## Context

See proposal.md for why this change exists. The constraints that shape the model:

- **Pages are server-rendered and CDN-cached for up to 5 minutes** (`design-public-site`, `PRODUCT.md`). Gallery lists in the first HTML are always the NSFW-hidden view. Reads made while rendering are bounded by cache misses, not by visitors.
- **The gallery loads in pages of 24, newest first**, with a ringed-tail timeline that marks where each year starts and a header showing the piece count and date range. Both need to know about every visible piece, not only the loaded page.
- **Filters are planned as Characters, Artists, Tags and Year, combinable, with a sort**, and the URL carries them.
- **Firestore allows one `array-contains` per query**, and every equality-plus-sort combination needs its own composite index (200 per database without billing). Map fields keyed by ID would need an index per person.
- **A single Firestore document sustains about one write per second.** Every summary lives in one document, so bursts of writes contend.
- **Scale:** a single owner, a few hundred published pieces today, growing by tens a year. Firestore's free tier is 50,000 reads and 20,000 writes per day. The public server (App Hosting) may run several instances, each with its own memory.
- **Region:** Firestore, Storage and Functions are in `europe-west6`.

## Goals / Non-Goals

**Goals:**
- Any combination of filters and any sort, served in pages of 24, with a bounded number of Firestore reads.
- One read for the gallery, a handful for an artwork page.
- One source of truth per fact: the admin edits people and images only; everything under `meta` is derived.

**Non-Goals:**
- Sets and linked versions of a piece.
- A person's bio or reference sheet. A separate reference sheet page with several images is future work.
- Typed tag groups.
- Readable slugs in URLs. People and artworks are addressed by ID; a slug can be appended later as decoration without breaking links.
- Visitor accounts or any visitor-written data.
- Previewing unpublished pieces on the public site.
- Generating thumbnails and full images from an upload, and the person page's own behaviour. Both come with later changes; this change fixes the file names and the data those pages read.

## Decisions

### D1. Collections

```
people/{personId}                  people/tigy is the site's own person
  name           string
  avatar         string?           Storage path
  links[]        { network, handle, url }   ordered
  createdAt, updatedAt

images/{imageId}
  title          string?
  description    string?
  date           string?           artwork date: YYYY, YYYY-MM or YYYY-MM-DD
  sortDate       string            YYYY-MM-DD, see D1 notes
  published      bool
  nsfw           bool
  artistIds[]    person IDs, ordered (lead artist first)
  characterIds[] person IDs, ordered (Tigy first)
  tags[]         string, flat, normalised
  file           { original, w, h, bytes, mime, animated, transparent }
  createdAt, updatedAt

meta/gallery                       written only by Cloud Functions
  items          string            JSON array of rows for published images, see D3
  updatedAt

meta/people                        written only by Cloud Functions
  items          string            JSON array of { id, name, avatar } for every person
  updatedAt

meta/tags                          written only by Cloud Functions, owner-read only
  counts         map               tag -> number of images using it, any image
  updatedAt
```

- **Tigy is the fixed document `people/tigy`**, not a flagged person, so there is exactly one by construction and the server reads it directly. Credits render Tigy without links and link to the home page, and `/p/tigy` redirects to `/`. The home header's avatar and the owner's social links come from this person, replacing the site configuration that `design-public-site` task 2.2 uses until this model exists.
- **Credits are ordered ID arrays, not maps.** Arrays keep the credit order; a map neither keeps order reliably nor sorts by date without an index per key.
- **Dates may be partial.** Older commissions are often known only to the year or month. `sortDate` is the first day of the given period (`2019` → `2019-01-01`, `2021-04` → `2021-04-01`), or the day the image was added when there is no date, and pages show only the precision given. Without partial dates, a first import of old pieces would either invent days or pile every undated piece onto the import day.
- **Tags are normalised on save**: trimmed, inner spaces collapsed, lowercased. A URL carries the tag itself, URL-encoded (`?tag=reference%20sheet`), so there is no second spelling to keep in sync.
- **Files have fixed names** in the default Storage bucket, so a tile can build its URL from the image ID alone:
  ```
  images/{id}/thumb.webp       tiles
  images/{id}/full.webp        artwork page; animated pieces as animated WebP
  images/{id}/original.{ext}   download; path stored in file.original
  ```

### D2. Credits are references, not copies

An image stores only person IDs. The artwork page reads the image, then its people with one batched `getAll` (one read per person, one round trip). `meta/people` carries only what the filter pickers and chips need (ID, name, avatar); links and everything else stay on `people/{id}`.

- *Why:* no fan-out function to keep copies on images in sync, no stale credits, and the extra reads (two to five per artwork render, bounded by the CDN cache) stay far inside the free tier.
- *Alternative:* copies of each person's name and links on the image, updated by a function when a person changes. Saves those reads and one round trip, at the cost of a fan-out trigger, staleness windows and drift. Rejected by the owner in favour of a single source of truth.
- *Alternative:* the full public person (with links) in `meta/people`, so no public page reads `people/{id}`. Rejected: `meta/people` stays a small list for the pickers.

### D3. The gallery summary (`meta/gallery`)

One document holds a row for every **published** image:

```
{ id, title, sortDate, w, h, nsfw, artistIds, characterIds, tags }
```

- `items` is **one JSON text field**, not a Firestore array. To Firestore it is one field, so the per-document field limit and automatic indexing do not apply; only the 1 MiB document size does (about 4,000 rows at ~250 bytes). `meta/people`'s `items` is stored the same way. Both fields are exempted from indexing in `firebase/firestore.indexes.json`, since nothing queries them.
- Unpublished images never appear in it.
- **No aggregates are stored.** The piece count, date range, timeline years and filter choices differ between the NSFW-hidden and NSFW-shown views, so the server computes them from the rows for the view requested. With the switch off, a tag, character, artist or year that appears only on NSFW pieces is left out. Storing both views would double what the trigger maintains with nothing gained, since the server already holds every row.
- *Alternative:* a Firestore array of maps. Readable in the console, but every row's fields may count toward the 20,000-field limit (a ceiling near 2,000 rows) and the array is indexed unless exempted.
- *Alternative:* Firestore queries per filter. Cannot combine more than one array filter, and every filter-plus-sort combination needs its own composite index.
- *Alternative:* a hosted search service. Works, but it's another paid service for a few hundred items.

### D4. Keeping the summaries current

- **Images.** A Firestore trigger on `images/{imageId}` writes runs one transaction that re-reads the image (so out-of-order trigger events cannot write a stale row), adds, replaces or removes its row in `meta/gallery`, and adjusts `meta/tags` by the difference between the image's tags before and after the write, removing a tag that reaches 0. After writing, it logs a warning when `meta/gallery` passes about 70% of 1 MiB. `meta/tags` counts every image, published or not, so a draft's new tag is suggested too.
- **People.** A trigger on `people/{personId}` writes adds, replaces or removes that person's entry in `meta/people`.
- **Deleting an image.** The owner may delete an image from the admin. The image trigger removes its row and tag counts, and also deletes everything under `images/{id}/` in Storage, so no public file outlives its image.
- **Full rebuild.** An owner-only callable rebuilds `meta/gallery`, `meta/people` and `meta/tags` from every image and person. It is the recovery path if a summary drifts.
- **Bulk writes and the rebuild.** The first import changes many images at once, and its triggers contend on the same documents; some may fail after their retries. Run the full rebuild once the import's triggers have finished: rows are replaced, so a late trigger cannot spoil them, but tag counts are adjusted by differences, so a trigger that arrives after a rebuild adds its difference to counts that already include it.
- **Renaming tags is deferred.** A rename would rewrite every image carrying the tag and then rebuild, and the triggers arriving after that rebuild would count each renamed tag twice. Renaming needs `meta/tags` to record each image's tags, so that a trigger replaces that image's entry and recounts instead of adding a difference; it comes with a later change. Until then the owner fixes a tag by editing the artworks that carry it.
- *Alternative:* rebuild the whole document on every save. Simpler and self-healing, but it reads every image on each save; kept only as the manual rebuild.
- *Alternative:* bulk writes mark themselves so the trigger skips them. Cleaner, but every write path would have to respect the mark.

### D5. Filtering, sorting and paging run on the public server

```
request  /?character=X&tag=Y&year=2025&sort=oldest              (first HTML)
         /api/gallery?character=X&...&after=2025-11-20_k3x      (scrolling)
   |
   v
summary rows (in memory, read from meta/gallery once per cache period)
   |  filter: every row, any combination of filters
   |  filter: drop nsfw rows unless the request asks for them
   v
matching rows -> sort by (sortDate, id) -> the 24 after the cursor -> tiles
```

- The server keeps the parsed summaries in memory with a short expiry (no longer than the 5-minute page cache), so later pages and filter changes cost no Firestore reads. `meta/people` is read only when needed: when a visitor opens a people picker, or when the server renders a URL that carries filters and must show the active chips by name. An unfiltered page never reads it.
- **Paging uses a cursor, not a page number.** A request asks for the pieces after the last one the visitor already has, `after={sortDate}_{id}`, in the total order `(sortDate, id)`. The server compares values rather than looking the cursor piece up, so it still works when that piece has since been unpublished or deleted. *Why:* with page numbers, a piece published or unpublished between two requests (or a request reaching an instance with a newer cache) shifts every later page by one, repeating or skipping a piece; equal `sortDate`s also need a tiebreak. The shareable page URL carries only the filters and the sort.
- Filters carry person IDs (`?character={id}`) and tags as they are.
- Gallery lists in the first HTML always exclude NSFW rows. NSFW rows are only returned to a request that asks for them after the visitor turns the switch on.
- `/api/` responses are CDN-cacheable per URL, like the pages, and send `X-Robots-Tag: noindex`; `robots.txt` disallows `/api/`.
- The browser never holds the full list.
- *Alternative:* send the whole summary to the browser and filter there. Filter changes would be instant, but the full list, including NSFW titles, would sit in the page source.

### D6. Artwork pages and link previews

- **Previous and next** walk the whole gallery, newest first, in the same `(sortDate, id)` order. In the first HTML they skip NSFW pieces; with the switch on, the browser replaces them with the NSFW-inclusive neighbours after load. Following the filtered list the visitor came from is later work.
- **Link previews are on by default, NSFW included.** `/i/{id}` carries the artwork's real title and `og:image`. `/i/{id}?safe` carries a generic site card and no NSFW details. The share menu offers "safe share" for NSFW pieces. Anyone may add `?safe`, and nothing is stored for it.
- **On the site, NSFW still waits for the visitor.** For an NSFW piece, the first HTML renders the title, description, credits and tags behind the existing confirm screen, so confirming needs no second request. The `<img>` is only added once the visitor confirms or has the switch on.
- **NSFW artwork pages are never indexed**: they always send `noindex`, with or without `?safe`, and no sitemap lists them.
- Unpublished or missing artworks render the not-found page. A credit whose person cannot be found is left out.

### D7. What each page reads

| Page | Firestore reads per render |
|---|---|
| Home and gallery | `meta/gallery`, 1 (0 while cached in memory) |
| Gallery with filters in the URL | plus `meta/people`, 1 (0 while cached) |
| Further gallery pages | 0 while cached |
| Opening a people picker | `meta/people`, 1 (0 while cached) |
| Home header | `people/tigy` 1, plus the summary for count, date range and years |
| Artwork page | `images/{id}` 1, plus one per credited person; previous and next come from the summary |

Gallery tiles need no image documents: a row carries the ID, title and shape, and the thumbnail URL follows from the ID.

### D8. Security

- Public pages read Firestore only through the server with the Admin SDK, so Firestore rules deny every client except the signed-in owner. The public site's browser code never talks to Firestore; it calls the server's endpoints.
- **The owner is the account with the custom claim `owner: true`.** The Firestore rules, the Storage rules and the owner-only callables check that one claim (`isOwner()` in the rules). The admin signs in with Google only and has no registration: a `beforeUserCreated` blocking function refuses every Google account except the owner's email, kept as a Cloud Functions parameter rather than in the repository, and sets the claim when the owner's account is created. With Firebase, a first Google sign-in creates the account, so leaving out a register page alone would not stop strangers' accounts. Blocking functions need Firebase Authentication with Identity Platform, which the owner enables in the console with admin sign-in; one owner stays far inside its free tier. *Alternatives:* a fixed UID or the owner's email in the rules (ties the rules to one account, and the email would sit in the repository); a claim set once by a script, without the blocking function (strangers' accounts could still be created, though the rules refuse them everything).
- The owner, in the admin, may read everything, create and update `people` and `images`, and delete `images`. Deleting a person goes through a callable function that refuses while the person is credited on any image, published or not, so the rules deny client deletes of `people`.
- Everything under `meta` is written only by Cloud Functions; the rules deny all client writes to it. Only the owner may read `meta/tags`, since it includes tags of unpublished and NSFW pieces; the public pickers come from the visible rows instead.
- **Storage** allows public reads under `images/{id}/` and writes only by the owner and functions. An unpublished piece's files are protected only by its ID: Firestore auto-IDs are 20 random characters and an unpublished ID never appears on the public site. *Alternative:* a private drafts folder, moved on publish. Truly private, but every publish change would move files; not worth it for a single-owner art site.
- **Admin counts.** The admin shows SFW, NSFW and unpublished counts from its own query of `images`; the public header shows only the count of what the visitor may see.

## Risks / Trade-offs

- [The gallery summary outgrows 1 MiB] → about 4,000 rows of headroom against a few hundred pieces; the size warning (D4) gives years of notice. If needed: shorter keys and omitted empty fields, then one summary document per year merged in memory, then a search service.
- [A summary drifts from the images or people, for example after a failed trigger or a bulk write] → the triggers re-read inside transactions, bulk operations end with a full rebuild, and the manual rebuild restores everything.
- [A credited person is deleted] → the admin refuses to delete a person still credited on any image (found by querying `artistIds` and `characterIds`); the artwork page skips any ID it cannot resolve rather than failing.
- [An unpublished piece's files are reachable by someone who has its ID] → IDs are unguessable and never published; accepted for a single-owner site.
- [The default link shows an NSFW preview wherever it is posted] → chosen by the owner; "safe share" gives a generic card, the site still gates the piece behind the confirm screen, and NSFW pages are never indexed.
- [An artwork page waits for two Firestore round trips] → both are in-region and only happen on a CDN cache miss.
- [The summaries are read stale for up to the cache period after an edit] → acceptable: pages are already CDN-cached for 5 minutes.
- [Each App Hosting instance keeps its own cache] → each costs one read per summary per cache period; still far inside the free tier.
- [Filter changes make a request instead of filtering in the browser] → responses are small and cached per URL; this is the price of keeping NSFW rows out of the browser.

## Migration Plan

There is no existing data. Deploy the Firestore and Storage rules and the index exemption, then the functions, then the public and admin code that reads and writes the new model. Import the first images (with ready-made thumbnails and full images until the upload change lands), then run the full rebuild. Rollback is a redeploy of the previous rules and functions; the collections can be deleted while nothing is published.

## Open Questions

- None. How the rules recognise the owner is decided in D8; the blocking function and the Google sign-in are built with admin sign-in.

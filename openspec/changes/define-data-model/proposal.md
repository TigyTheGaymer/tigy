# Proposal

## Why

The public site and the admin need a Firestore data model before any feature can be built: the mockup (`design-public-site`) only carries rough notes, and `PRODUCT.md` lists the model as undecided. The gallery must let visitors combine filters (characters, artists, tags, year) with a sort while loading pages as they scroll, and Firestore queries alone cannot do that, so the model has to solve it.

## What Changes

- **People.** One `people` collection for artists and characters alike: name, avatar and ordered social links. Tigy, the site's own person, is the fixed document `people/tigy`. No bio, no reference sheet and no slug: people are addressed by ID (`/p/{id}`).
- **Images.** One `images` collection, the source of truth for each artwork: title, description, artwork date (year, month or day), sort date, published and NSFW flags, flat lowercase tags, file details, and credits as ordered person ID lists (`artistIds`, `characterIds`). Images hold no copies of people. Files live in Storage under `images/{id}/` with fixed names for the thumbnail and full image.
- **Derived summaries, written only by Cloud Functions.** `meta/gallery` holds a small row for every published image (as one JSON text field). `meta/people` holds every person's ID, name and avatar for the filter pickers. `meta/tags` holds every tag in use with its count, for the admin only. No counts, date ranges or tag lists are stored: the public server computes them from the rows for what the visitor may see.
- **Filtering and paging.** The public server filters and sorts all rows in memory and returns the matching pieces 24 at a time, continuing after the last piece the visitor has, so any combination of filters works with lazy loading at the cost of one Firestore read per cache refresh.
- **NSFW in shared links.** An artwork link shows its real title and image in link previews by default, NSFW pieces included; a "safe" variant of the link shows a generic card. On the site, an NSFW piece still waits behind the confirm screen unless the visitor has the NSFW switch on, and NSFW artwork pages are never indexed.
- **Owner tools.** The owner can delete an artwork (its row and files go with it) and rename or merge a tag across every artwork.
- **Removed from the design: sets and "other versions".** A clean and an NSFW version of a piece are two separate images. The artwork page drops its "other versions" section.
- **Removed from the design: copies of people on images.** The artwork page loads its people by ID; this supersedes the data-model notes in `design-public-site`.

## Capabilities

### New Capabilities

- `gallery-catalog`: how artworks and people are stored, and how the public site lists, filters, sorts and pages published artworks, including NSFW exclusion, link previews and what each page reads.

### Modified Capabilities

- None. (`public-gallery` is still a delta inside the in-flight change `design-public-site`, not an archived spec; its "set and other versions" wording is updated in that change.)

## Impact

- **Firestore:** new collections `people` and `images` and the documents `meta/gallery`, `meta/people` and `meta/tags`; Firestore rules (public reads go through the server, writes are owner-only, `meta` is written only by functions) and an index exemption for the summaries' text fields.
- **Storage:** public reads under `images/{id}/`, no client writes outside the owner. Generating thumbnails and full images from an upload is a later change.
- **Cloud Functions (`apps/functions`):** triggers on image and person writes that keep the `meta` documents current, a trigger that deletes an image's files, and owner-only callables for a full rebuild, deleting a person and renaming a tag.
- **Public site (`apps/public`):** server-side gallery, artwork and people endpoints with an in-memory cache of the summaries, link-preview metadata, and `noindex` on the API and on NSFW artwork pages.
- **Admin (`apps/admin`):** edits people and images only; tag suggestions from `meta/tags`; SFW, NSFW and unpublished counts from its own image query.
- **Other changes:** `design-public-site` must drop sets and "other versions" from its proposal, design, `public-gallery` spec and task 4.3, replace its data-model notes with a pointer to this change, and take the NSFW link-preview behaviour from this change. `PRODUCT.md` must mark the data model as decided and reword the NSFW preview rule.

# Design

## Context

See proposal.md for motivation and scope. After the earlier changes, image entries carry `artistId` and an `artist` copy in their types (`add-image-upload`'s data model), but nothing sets them. Public pages are one anonymous query each (A3, A5 in `add-public-gallery`), and lists follow the visitor's NSFW switch (`add-nsfw-handling`).

## Goals / Non-Goals

**Goals:**
- Every public page stays one Firestore query with no follow-up lookups, including the artist credit.
- An artist's credit is never removed silently.

**Non-Goals:**
- Private contact data for artists.
- Visual design of artist management and the artist page (separate UI/UX change).

## Decisions

### Product decisions this change builds on

- **#1 Artists are separate records.** Each artist is entered once, picked from a list, and gets their own page.
- **#6 IDs:** artists get Firestore auto-IDs too, used in their URL (`/artists/{id}`).
- **#8 Artist records hold public links only:** a name plus a free list of links (label + URL). No private contact data is stored.

### Data model

```
artists/{id}
  name, links[{ label, url }]

images/{id}
  artistId?                       reference to artists/{id}
  artist?   { name, links[] }     copy of the artist record for display (A6)
```

### A6 - The artist's public record is copied onto each image

`images/{id}.artist = { name, links }`. The admin writes the copy together with `artistId` when an artist is assigned. When an artist doc is updated, a function queries `images where artistId == id` and updates every copy with `BulkWriter` (no 500-write batch limit), drafts included.

- *Why:* the gallery and image pages need no second read. Artist edits are rare, and a fan-out of a few dozen writes is negligible.
- *Alternatives:* a join at read time (one extra read per distinct artist on every page); a single `meta/artists` map doc (one read for all names, but another special doc to maintain; its map would need indexing disabled to stay under the 40,000 index-entries limit).
- *Trade-off:* after an edit, copies are stale for a second or two.

### A7 - Deleting an artist leaves its images untouched

Images keep `artistId` and their `artist` copy, so the credit and links stay visible. The artist page for a deleted ID shows "not found", which it must handle anyway. The admin can flag images whose `artistId` no longer exists, since it already loads the full artist list.

- *Alternatives:* blocking the delete until images are reassigned; automatically unlinking images (removes the credit silently).

### Artist page queries

The artist page lists `published == true` and `artistId == id` (plus `nsfw == false` when the switch is off), ordered and paged like the gallery (A5). It needs two composite indexes, with and without the `nsfw` filter, each ending with the document-ID tiebreaker.

## Risks / Trade-offs

- [Artist copies are briefly stale after an edit] → accepted (A6).
- [A deleted artist's links stay on their images and may go out of date] → the admin flags those images so the owner can reassign them (A7).

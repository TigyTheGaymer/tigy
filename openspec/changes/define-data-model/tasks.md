# Tasks

Build order: this change provides the stored data and the server endpoints that the public pages read. The pages themselves, and their look, come from `design-public-site` and the page changes that follow; the admin's editing screens come with admin sign-in, and generating thumbnails and full images comes with the upload change. Run tasks through Nx (`npx nx ...`) and test Firestore and Storage behaviour against the emulators.

## 1. Shared model (`libs/models`) and gallery logic (`libs/gallery`)

- [x] 1.1 Define the `Person`, `Image`, `GalleryRow`, `PeopleEntry` and `TagCounts` types from design D1 and D3, the fixed ID `tigy` and the Storage paths `images/{id}/thumb.webp`, `full.webp` and `original.{ext}`, and export them from `libs/models`; verify `npx nx run-many -t lint,test -p models` passes and the functions and public app can import them
- [x] 1.2 Write pure functions that parse and format a partial date (`YYYY`, `YYYY-MM`, `YYYY-MM-DD`), work out `sortDate` from it or the day added, and normalise a tag (trim, collapse spaces, lowercase); verify with unit tests for "Year only", "Undated piece", "Partly dated piece" and "Case and spacing", and that malformed dates are rejected
- [x] 1.3 Write pure functions that turn a published image into a row, build `meta/gallery` from all images (published only, JSON `items`), build `meta/people` from all people, and build `meta/tags` counts from all images, plus a function that adjusts tag counts from an image's tags before and after a write; verify with unit tests for an unpublished piece left out of the rows but counted in the tags, and a tag removed when its count reaches 0
- [x] 1.4 Write the pure gallery query: filter rows by any combination of character, artist, tag and year, drop NSFW rows unless asked, sort newest or oldest first in the `(sortDate, id)` order, and return the 24 rows after an `after={sortDate}_{id}` cursor with whether more remain; verify with unit tests for "Character, artist and year together", "No matches", "Oldest first with a filter", "Scrolling to the second page", "A piece is published while scrolling", "Switch off", and a cursor whose piece no longer exists
- [x] 1.5 Write the pure overview and neighbour functions: count, date range, years and the tag, character and artist choices from the visible rows for each NSFW mode, and the previous and next piece of an artwork in the newest-first order; verify with unit tests for "Tag used only on NSFW pieces", "Timeline before scrolling" and "Next skips an NSFW piece"
- [x] 1.6 Write the conversion between a gallery query and its URL parameters in both directions (person IDs, URL-encoded tags, year, sort); verify with unit tests that every filter combination and sort survives a round trip and that unknown or malformed parameters fall back to the unfiltered, newest-first gallery

## 2. Firestore and Storage rules and indexes

- [x] 2.1 Replace the placeholder `firebase/firestore.rules` with the rules from design D8 behind one `isOwner()` check: no access for anyone else, owner reads everything, owner creates and updates `people` and `images` and deletes `images`, no client deletes of `people`, no client writes under `meta`, `meta/tags` readable only by the owner; verify with rules tests against the Firestore emulator, including "Direct database read"
- [x] 2.2 Replace the placeholder `firebase/storage.rules` with public reads under `images/{id}/` and owner-only writes, everything else denied; verify with rules tests against the Storage emulator that a visitor can read a thumbnail and cannot write or read outside `images/`
- [x] 2.3 Exempt the `items` fields of `meta/gallery` and `meta/people` from indexing in `firebase/firestore.indexes.json`; verify the emulator loads the file and that writing a summary near 1 MiB succeeds

## 3. Cloud Functions (`apps/functions`)

- [ ] 3.1 Add a trigger on `images/{imageId}` writes that, in one transaction, re-reads the image, adds, replaces or removes its row in `meta/gallery`, adjusts `meta/tags`, and logs a warning above 70% of 1 MiB; on delete it also removes everything under `images/{id}/` in Storage; verify with emulator tests for publishing, editing, unpublishing and deleting an image, "Publishing later" and "Deleting a published artwork"
- [ ] 3.2 Add a trigger on `people/{personId}` writes that adds, replaces or removes the person's entry in `meta/people`; verify with emulator tests for creating, renaming and deleting a person
- [ ] 3.3 Add an owner-only callable that rebuilds `meta/gallery`, `meta/people` and `meta/tags` from every image and person; verify with an emulator test that deliberately corrupted summaries are restored and that a non-owner call is refused
- [ ] 3.4 Add an owner-only callable that deletes a person only when no image, published or not, credits them, and otherwise returns the crediting images; verify with emulator tests for "Deleting a credited artist" and for deleting an uncredited person

## 4. Public server endpoints (`apps/public`)

- [ ] 4.1 Initialise the Firebase Admin SDK in the server and keep the parsed `meta/gallery` and `meta/people` in memory for at most 5 minutes, reading `meta/people` only when a request needs names; verify with a test that repeated requests inside the period read Firestore once, a request after it reads again, and an unfiltered gallery request never reads `meta/people`
- [ ] 4.2 Add `GET /api/gallery` to `apps/public/src/server.ts`, taking the URL parameters from 1.6, an `after` cursor and an NSFW flag, returning 24 rows plus whether more remain and the overview for that NSFW mode, with CDN cache headers matching the pages and `X-Robots-Tag: noindex`; verify with endpoint tests for "Changing the sort after scrolling", "Switch on", "Crawling the data endpoints", and that a request without the NSFW flag never returns an NSFW row
- [ ] 4.3 Add `GET /api/people` returning the people who appear in visible pieces for an NSFW mode, with names and avatars from `meta/people`, for the pickers and filter chips; verify with endpoint tests that a person credited only on NSFW pieces is left out with the flag off and included with it on
- [ ] 4.4 Add endpoints for one artwork (the image, its credited people in order, previous and next for an NSFW mode) and for the home header (`people/tigy`, piece count, date range, years); unpublished or missing artworks return not found and unresolvable credits are left out; verify with endpoint tests for "Unpublished artwork", "Credit order", "Missing person" and "Tigy credited as a character"
- [ ] 4.5 Add the artwork page's head metadata: real title and `og:image` by default, the generic site card with `?safe`, `noindex` on every NSFW artwork page, and `Disallow: /api/` in `robots.txt`; verify on the SSR build for "Default link to an NSFW piece", "Safe link to an NSFW piece" and "Search engines"
- [ ] 4.6 Add Angular data services in `apps/public` that call these endpoints with `HttpClient`, so the same code runs during server rendering and in the browser and the browser reuses the server's responses on hydration; verify on the SSR build that a filtered link's first HTML contains the right first 24 pieces and the active filters by name ("Shared filtered link"), contains no NSFW title in the gallery with the switch off, renders an NSFW artwork's details behind the confirm screen without its `<img>` ("Opening an NSFW link with the switch off"), and that hydration makes no second request for the same data

## 5. Integration

- [ ] 5.1 Add an emulator seed script that creates `people/tigy`, placeholder people and the mockup's five pieces as images (one marked NSFW for testing, labelled as such, and one with a year-only date), uploads ready-made `thumb.webp`, `full.webp` and originals to the Storage emulator, and runs the rebuild; verify the seeded gallery and an artwork page render through the endpoints, and that the timeline years and header count match the seed
- [ ] 5.2 With the seeded emulators and the SSR build, check end to end that editing a person's link, renaming a person, publishing an image and deleting an image appear on the public pages after the server cache expires ("Editing a person", "Owner edits a social link", "Renaming a person"); record the result in this change

## 6. Align other planning documents

- [x] 6.1 In `design-public-site`, remove sets and "other versions" from `proposal.md`, `design.md` (D3, D5, States to show), the `public-gallery` spec's credits requirement and task 4.3, replace its data-model notes and the filter note ("combined filters are applied in the browser") with a pointer to this change, point its NSFW notes (D4) to this change's link-preview behaviour, and change task 2.2 to read the social links from `people/tigy`; verify `openspec validate design-public-site` passes and a search for "other versions", "set" and "applied in the browser" finds no leftover mention
- [x] 6.2 In `PRODUCT.md`, mark the data model as decided (people and tags; no bio, reference sheet or slug on people; flat tags), pointing to this change, and reword the NSFW rules so NSFW stays out of the gallery and search by default and out of link previews when shared with the safe link; verify the Undecided line no longer lists the data model, tags or people's bio and reference sheet, and that Operating Context and principle 4 agree with the "Artwork links preview by default" requirement

## Workflow follow-up

- Generate `thumb.webp` and `full.webp` and fill the file details from an upload in the upload change.
- With admin sign-in: enable Firebase Authentication with Identity Platform, add Google sign-in and the `beforeUserCreated` blocking function that admits only the owner and sets the `owner` claim (design D8).
- Renaming and merging tags, once `meta/tags` records each image's tags (design D4).
- Filter-aware previous and next, and the person page's behaviour, come with the page changes.
- Archive the change once implemented and reviewed.

# Proposal

## Why

The gallery already filters by character, artist, tag and year, but a visitor can only reach a filter by following a credit or a tag on an artwork page. The filter row's four pickers (Characters, Artists, Tags, Year) are shown as "coming later" and do nothing. This change makes them work, so visitors can narrow the gallery from the home page.

## What Changes

- Each picker chip opens a picker: a dropdown under the chip on wide screens, a bottom sheet on phones.
- A picker lists its choices with how many pieces each one has. Characters and artists show their avatar and name, tags show the tag, and Year lists the years newest first.
- Pressing a choice applies it at once: the gallery and the address change, and the picker stays open so the visitor can pick more. Active choices are shown ticked, and pressing one again removes it. Several characters, artists or tags must all match, as now. Several years now match a piece from any of them, so picking another year adds its pieces.
- Choices narrow to the pieces that match the other active filters, with counts for those pieces, so no choice leads to "Nothing matches". The Year picker leaves the active years out when it narrows, so the visitor can add years.
- The Characters, Artists and Tags pickers have a search field that narrows the list by name as the visitor types.
- The choices follow the NSFW switch, as the overview already does: with the switch off, a person, tag or year found only on NSFW pieces is not offered.
- The "Filters coming later" note and the pickers' disabled state are removed.
- The row's one-chip-per-filter list is replaced by counts on the pickers ("Characters · 2", "Year · 1") and a "Clear all" chip, so many filters never run past the edge. An active filter is always listed in its picker, ticked, even when nothing matches it, so it can be removed there.
- The gallery data endpoint returns the narrowed choices with the first page, so opening a picker needs no further request.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `public-gallery`: the "Filter row" requirement now has working pickers (dropdown or bottom sheet, search, apply at once, ticked active choices) instead of inactive ones.
- `gallery-catalog`: adds a requirement that filter choices narrow to the pieces matching the other active filters, with their counts, and that the year choices ignore the active years. "Filters combine" now lets several years match a piece from any of them. "Filtered links are complete pages" now shows which pickers are active instead of naming each filter.
- `public-pages`: "Filters from the address" names active filters inside their pickers, with counts on the pickers, instead of one removable chip each.

## Impact

- `libs/gallery`: a function that works out the narrowed choices for a query (people, tags, years), reusing `galleryOverview` and `matchesQuery`, with specs. `GalleryQuery.year` becomes `years`, read from a repeated `year` parameter; old single-year links keep working.
- `apps/public/src/api/types.ts` and `apps/public/src/server/api.ts`: `GET /api/gallery` returns `choices` (characters and artists with names and avatars, tags, years) on the first page. Responses stay cached per URL, as now.
- `apps/public/src/app/home/filter-row/`: the pickers become a picker component that opens a native `<dialog>`, with its search field and choice links. `home.ts` passes the choices from the gallery's first page.
- `apps/public/DESIGN.md` and the e2e tests in `apps/public-e2e/src/` (`design.spec.ts` replaces the "coming later" test, `home.spec.ts` gains picker tests).
- No new dependencies and no data model changes.

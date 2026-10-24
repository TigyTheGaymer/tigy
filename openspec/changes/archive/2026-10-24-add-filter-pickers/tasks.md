# Tasks

## 1. Narrowed choices

- [x] 1.1 Add `FilterChoices` and `filterChoices(rows, query, nsfw)` to `libs/gallery/src/lib/overview/overview.ts`, reusing `visibleRows`, `matchesQuery` and the `add`/`choices` helpers. Verify with `overview.spec.ts`: people and tags count only rows matching the whole query, an active tag or person appears with the full match count, years ignore the active year but keep the other filters, NSFW-only values are left out with the switch off, and the order is most used first then by name
- [x] 1.2 Add `GalleryChoices` to `apps/public/src/api/types.ts` and have `GET /api/gallery` in `server/api.ts` set `choices` when there is no `after` cursor, joining people with `summaries.people()` and skipping unknown IDs. Verify with `api.spec.ts`: a first page carries narrowed choices with names and avatars, a page with `after` has none, and `nsfw=1` changes the choices

## 2. Picker choices in the filter row

- [x] 2.1 Add `pickerChoices(query, choices)` in `apps/public/src/app/home/filter-row/picker-choices.ts`, returning per picker the `PickerChoice` list with each choice's toggled address (add or remove a person or tag, set or clear the year, sort kept) and selected choices first. Verify with `picker-choices.spec.ts`, including a year choice replacing the active year and an active choice's address removing it
- [x] 2.2 Pass the query and `pages.first()?.choices` from `HomePage` to `FilterRow`, and build the pickers from `pickerChoices`. Remove the "Filters coming later" note, the `aria-disabled` buttons and their `button.chip` cursor rule. Verify with `home.spec.ts` that the row renders four enabled picker chips and no "coming later" text

## 3. The picker

- [x] 3.1 Create `FilterPicker` in `apps/public/src/app/home/filter-row/filter-picker/` (chip button with `aria-haspopup` and `aria-expanded`; a `<dialog>` rendered while open and opened with `showModal()` in an `afterRenderEffect`; choice links with check mark, people dot, name, count and ", selected" in the accessible name; backdrop click, Escape and a close button close it and return focus to the chip; `aria-busy` while the next first page loads). Verify with `filter-picker.spec.ts`: opening shows the choices, a selected choice is marked, the links carry the toggled addresses, and each way of closing returns focus to the chip
- [x] 3.2 Add the search field to the Characters, Artists and Tags pickers (signal plus `computed`, case-insensitive contains, focused on open, cleared on close, "No matches" when empty). Verify in `filter-picker.spec.ts` that typing narrows the list and that the Year picker has no field
- [x] 3.3 Style the dropdown above 720px (fixed under the chip from its measured rect, re-measured on scroll and resize, 320px, kept inside the viewport, 8px corners) and the bottom sheet at 720px and below (full width, 16px top corners, heading and close button, up to 75vh), in both themes. Verify by opening each picker in the running app in light and dark mode at phone and desktop widths
- [x] 3.4 Navigate choices with `router.navigate` (`scroll: 'manual'`, `state: { keepGallery: true }`) and, in `HomePage`, handle the router's `Scroll` event for those navigations by scrolling the gallery start to just under the top bar when the visitor is past it. Verify in the running app that picking a tag with the row stuck keeps the dropdown under its chip and shows the new first piece, and that the active filter chips still scroll to the top
- [x] 3.5 Update the filter row and picker sections of `apps/public/DESIGN.md` (pickers working, dropdown and sheet, search, no "coming later" note; drop the note from the Label type role), and verify no other part of it still calls the pickers inactive

## 4. End-to-end

- [x] 4.1 Replace the "Pressing a picker" test in `apps/public-e2e/src/design.spec.ts` and add picker tests to `home.spec.ts` for the spec scenarios: picking a tag, a second character, unpicking, switching years, searching, narrowed choices with a tag active, an NSFW-only character hidden with the switch off, the phone sheet and Escape returning focus. Verify `npx nx e2e public-e2e` passes
- [x] 4.2 Run `npx nx run-many -t lint test build -p public gallery` and verify everything passes

## 5. Steady pickers

- [x] 5.1 Put the pickers first in the filter row, then the sort chip, then the active filter chips. Verify in the running app that picking a tag leaves the Tags chip and its dropdown where they were
- [x] 5.2 Add `steadyChoices(opened, current)` to `picker-choices.ts` and use it in `FilterPicker` (remember the choices on open, forget them on close; unavailable choices without `href`, `aria-disabled`, greyed out and not pressable; no dimming while loading). Verify with `picker-choices.spec.ts` (order kept, unavailable in place, new at the end) and `filter-picker.spec.ts` (unavailable choice does nothing, reopening orders afresh)
- [x] 5.3 Extend the "Picking a tag" e2e test to check that the list and the chip do not move and the non-matching tags show as unavailable, and verify the whole public e2e suite, lint, tests and build pass

## 6. Counts on the pickers

- [x] 6.1 Replace the active filter chips with counts on the picker chips ("Characters · 2", "Year · 2025", ink outline, "Characters, 2 selected" as the accessible name) and a "Clear all" chip after the sort chip; remove `active-filters.ts`. Verify with `home.spec.ts` that the counts, the accessible names and "Clear all" render, and that "Clear all" is absent without filters
- [x] 6.2 Have `pickerChoices` list every active value the choices leave out as selected with no pieces, named through the people lookup ("Unknown person", "…" while loading). Verify with `picker-choices.spec.ts` and the unknown-person test in `home.spec.ts`
- [x] 6.3 Update the e2e tests that read the active chips, add one with many filters that checks the counts, that the row is not cut off and that "Clear all" works, and verify the whole public e2e suite, lint, tests and build pass

## 7. Several years

- [x] 7.1 Turn `GalleryQuery.year` into `years` (repeated `year` parameter, any of them matches) in `gallery-query.ts`, `gallery-params.ts` and `filterChoices`. Verify with the gallery lib specs: round trips with two years, repeated years dropped, a piece from either year listed, year choices ignoring the active years
- [x] 7.2 Toggle years in `pickerChoices` like tags, keeping them newest first, and count them on the Year chip ("Year · 1"). Verify with `picker-choices.spec.ts` and `home.spec.ts`
- [x] 7.3 Update the e2e year tests and verify the whole public e2e suite, lint, tests and build pass

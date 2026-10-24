# Design

## Context

- Filtering already works end to end. `GalleryQuery` carries several character IDs, artist IDs and tags (all must match) and at most one year (see "Several years match any of them"). `matchesQuery` applies it, `galleryQueryToParams` turns it into the address, and the home page reads it from query parameter `input()`s.
- `galleryOverview(rows, nsfw)` already counts tags, characters and artists over the visible rows (`Choice { value, count }`, most used first), and `GET /api/people` joins the people choices with names and avatars from `summaries.people()`. Both use the whole gallery, not the filtered pieces.
- `GET /api/gallery` returns `overview` (whole gallery) and `years` (the filtered pieces, for the tail timeline). Every response is cached by the CDN per URL.
- `injectGalleryPages` keeps the last first page while a new one loads, and `GalleryPlaceService` keeps the first page for going back. Anything carried on the first page survives both.
- `FilterRow` renders the four pickers as `aria-disabled` buttons plus a "Filters coming later" note. The active filter chips and the sort chip are `RouterLink`s.
- The router uses `withInMemoryScrolling({ scrollPositionRestoration: 'enabled' })`, so every forward navigation, query parameters included, scrolls to the top of the page. The filter row is sticky only once the gallery is scrolled to it.
- The public app already uses native `<dialog>` with `showModal()` after render (`FullView`, `AgeCheckDialog`).

## Goals / Non-Goals

**Goals:**

- One function in `libs/gallery` that decides which choices a query offers, so the server and the specs agree on narrowing.
- No extra request to open a picker, and no change in what crawlers or the first HTML see.
- Keyboard and screen reader use: focus moves into the picker, Escape closes it, focus returns to the chip.

**Non-Goals:**

- OR filters for people or tags (any of several tags), excluding a tag, or ranges of years.
- Changing how active people are named. Choices carry names; `GET /api/people` still names active people the choices leave out, such as one who matches nothing.
- Rendering picker contents in the server HTML. The choices are links, but the gallery's own links already lead crawlers everywhere they need to go.

## Decisions

### `filterChoices` in `libs/gallery`

`overview.ts` gains `filterChoices(rows, query, nsfw): FilterChoices` with `characters`, `artists`, `tags` (each `Choice[]`) and `years` (`YearMark[]`, newest first).

- People and tags come from the visible rows that match the whole query, counted with the same `add` and `choices` helpers as `galleryOverview`. Because several values must all match, a choice that is offered always leaves at least one piece, and an active value appears with the full match count.
- Years come from the visible rows that match the query with its years removed, so the Year picker can add years. This is the only dimension treated this way, because it is the only one where another value widens the gallery instead of narrowing it.

### Several years match any of them

The owner asked for the Year picker to behave like the others: tick several, see a count on the chip. A piece has one year, so several years that all had to match would always leave nothing. `GalleryQuery.year?: number` becomes `years: readonly number[]`, written as a repeated `year` parameter like `tag`, and `matchesQuery` keeps a piece whose year is any of them. An address with one `year` reads as before.

- The address lists years newest first whatever order they were ticked in, so one gallery has one address and one cache entry.
- Unticking a year is the one pick that narrows instead of widening, so it could leave an active year the other filters match nothing in. A year's address drops the active years the choices leave out, so it never leads to "Nothing matches".

_Alternative:_ keep one year at a time and only show "Year · 1" (no change to the query, but a visitor can't see two years together).

_Alternative:_ count each dimension without its own filter (classic facets). For the people and tag dimensions that would offer choices that combine with the active ones into nothing, which breaks "no dead ends".

### Choices travel with the first gallery page

`GalleryResponse` gains `choices?: GalleryChoices`, set only when the request has no `after` cursor. `GalleryChoices` holds `characters` and `artists` as `PickerPerson[]` (joined with `summaries.people()` like `/api/people`, skipping IDs with no entry), `tags` as `Choice[]` and `years` as `YearMark[]`.

Server rendering already waits for the first page, so its transfer state carries the choices to the browser, and every filter change already fetches a new first page. Later pages stay as small as they are now.

_Alternatives:_ a separate `GET /api/choices?…` (one more request per filter change and one more SSR wait, with the same cache key); sending choices on every page (wasted bytes on each scroll).

### The filter row builds each choice's address

A pure function `pickerChoices(query, choices)` in `filter-row/picker-choices.ts`, next to `active-filters.ts`, returns per picker a list of `PickerChoice { key, name, count, avatar?, isSelected, params }`. `params` is the address after toggling that choice: adding or removing the person, tag or year, with the sort kept. Selected choices come first, then the rest in the server's order. Years stay newest first.

`HomePage` passes `pages.first()?.choices` and the query to `FilterRow`; while a new first page loads, the previous choices stay on screen, and the list is marked `aria-busy`.

### An open picker keeps its list steady

Applying a pick at once first made everything move under the pointer: the new active filter chip pushed the picker and its dropdown along the row, the picked choice jumped to the top, and the list shrank to the narrowed choices. So:

- The filter row puts the pickers first, then the sort chip, then "Clear all" (see "Counts on the pickers" below).
- The picker remembers the choices it opened with. `steadyChoices(opened, current)` in `picker-choices.ts` keeps that order and takes each choice's current count and selection; a choice missing from the current choices stays in place as unavailable (`count: 0`, no `href`, `aria-disabled`), and a new one is added at the end. Closing forgets the order, so the next opening sorts selected first again.
- The list is no longer dimmed while the next page loads, which flashed on every pick.

_Alternatives:_ apply on close or with a "Show N pieces" button (calmest, but the gallery no longer answers each pick, which the owner wanted); closing after each pick (several picks need reopening).

### One `FilterPicker` component per chip, with a native `<dialog>`

`filter-row/filter-picker/filter-picker.ts` (with `.html`, `.css`, spec) takes the picker's name, icon, choices and whether it has a search field. The chip is a real `<button>` with `aria-haspopup="dialog"` and `aria-expanded`.

- Pressing it renders a `<dialog>` and an `afterRenderEffect` calls `showModal()`, as in `AgeCheckDialog`. A modal dialog gives the top layer, inert background, focus inside and Escape for free. A click whose target is the dialog element itself (the backdrop) closes it, since `closedby="any"` is not in every target browser. On close, focus goes back to the chip.
- Each choice is an `<a>` with the toggled address as its `href`, holding a check mark when selected, the avatar (people only, a round people dot), the name and the count. A plain click navigates through the router (see "Keeping the filter row in place" for why not `RouterLink`); a modified click opens a tab as any link does. A selected choice's accessible name ends with ", selected", so links need no `aria-pressed`. The home page stays the same component across query parameter changes, so the dialog stays open while the gallery reloads, and the pressed choice gets focus back if the re-rendered list moved it.
- The search field is a plain `<input type="search">` bound to a `signal`; a `computed` filters choices whose name contains the text, ignoring case. It gets focus on opening, is cleared on close, and an empty result says "No matches". The Year picker has no search field.
- Only one picker is open at a time. On wide screens a press outside the dropdown also reaches what is under it (`elementFromPoint` after closing, as a copy of the click with its modifier keys, and never to the picker's own chip), so pressing another chip switches pickers in one press; on phones a tap on the dimmed page only closes the sheet.

_Alternatives:_ the Popover API (no inert background or focus trap, so a bottom sheet would need both by hand); the CDK overlay (a new dependency in the public app for one dropdown).

### Dropdown on wide screens, sheet on phones

Above 720px, the dialog is placed under its chip with `position: fixed` at coordinates measured from the chip's `getBoundingClientRect()`, re-measured on `resize` and `scroll` while open. It is 320px wide, kept inside the viewport, with 8px corners (dropdowns are the standard step) and its list scrolling inside a height of at most 440px and the space left below the chip. At 720px and below, the same dialog docks to the bottom edge at full width, with 16px top corners, a heading with a close button, and up to 75vh.

_Alternative:_ CSS anchor positioning. Cleaner, but not yet in every browser the site supports.

### Keeping the filter row in place when a choice is pressed

Because the router scrolls to the top on each navigation, a choice pressed with the row stuck would throw the page back to the header and move the chip away from its open dropdown. A choice calls `router.navigate` with `scroll: 'manual'` (Angular 22's per-navigation switch for scroll restoration, which `RouterLink` does not expose) and `state: { keepGallery: true }`. `HomePage` listens for the router's `Scroll` event and, when the navigation carries that state and the visitor is past the gallery's start, scrolls a marker before the filter row to just under the top bar. So the first piece of the new result shows under the stuck row, matching "from the first piece", and the dropdown stays under its chip. Other navigations keep the router's behaviour, including "Clear all" and the sort chip.

_Alternatives:_ a `RouterLink` with state, overriding the router's scroll in a `Scroll` handler (tried: `router.events` reaches subscribers before the router's own scroller, so its scroll to the top wins); turning off scroll restoration for the home page (would also break going back from an artwork page).

### Counts on the pickers instead of active filter chips

With several filters active, one chip per filter ran past the edge of the row, which scrolls sideways with its scrollbar hidden, so filters were cut off. The owner chose to drop those chips:

- Each picker chip shows how many it has active, "Characters · 2" or "Year · 1", with the ink outline, and "Characters, 2 selected" as its accessible name. `FilterRow` works this out from the selected choices.
- A "Clear all" chip follows the sort chip while any filter is active; it links to the unfiltered address with the sort kept.
- `pickerChoices` now lists every active value, even one the choices leave out (no matching pieces, or a person who does not exist), as selected with no pieces, so a picker's count always matches its ticked choices and every filter can be unpicked. People the choices leave out are named through `GET /api/people`, as "Unknown person" when missing, and "…" while it loads. `active-filters.ts` is removed.
- The first HTML shows the counts on the pickers rather than each filter's name.

_Alternatives:_ active chips on a second, non-sticky line that wraps (keeps names at a glance, takes more room); wrapping the one sticky row (grows over the gallery while scrolling); a fade on the cut edge (filters stay hidden).

## Risks / Trade-offs

- [A long tag list grows the first page response] → a few hundred tags of a few bytes each is small next to 24 rows, and only the first page carries it.
- [Counts show old values while the next first page loads] → the list is `aria-busy` until it arrives; the pressed choice already shows as selected from the address.
- [An open list collects unavailable choices after several picks] → they stay greyed out only until the picker closes; reopening lists only what matches.
- [Choices bypass `RouterLink`, so its click handling (modifier keys, `target`) is repeated by hand] → only plain left clicks are taken over, and the `href` is built by the router, so every other click behaves as a normal link.
- [Visitors no longer see the active filters' names at a glance, for example after following a credit] → the picker's count marks where they are, and opening it lists them first, ticked.
- [The dropdown drifts on unusual scroll containers] → the page scrolls only the document, and it is re-measured on every scroll and resize.

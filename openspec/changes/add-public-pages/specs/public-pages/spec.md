# Spec Delta

## Purpose

Defines the public site's pages before styling: which addresses exist, what the home and artwork pages show and link to, how the NSFW switch and confirm screen behave, and how pages, previews, crawlers and images are served.

## ADDED Requirements

### Requirement: Public addresses

The public site SHALL serve the home page at `/` and an artwork's page at `/i/{id}`. Every other address, and an artwork that does not exist or is not published, SHALL render the not-found page with HTTP status 404 and a link to the home page.

#### Scenario: Unknown address

- **WHEN** a visitor opens `/no-such-page`
- **THEN** the not-found page is shown with status 404 and a link home

#### Scenario: Unpublished artwork link

- **WHEN** a visitor opens the address of an unpublished artwork
- **THEN** the not-found page is shown with status 404

### Requirement: Home page lists the gallery

The home page SHALL show the home header (Tigy's name, avatar and social links, and the count and date range of the pieces the visitor may see) and the first 24 pieces of the gallery, each linking to its artwork page. Each piece SHALL be shown at its own shape.

#### Scenario: Visitor opens the home page

- **WHEN** a visitor with the NSFW switch off opens `/`
- **THEN** the first HTML contains the header and the 24 newest SFW pieces, each linking to `/i/{id}`

### Requirement: Paging through the gallery

When more pieces follow, the home page SHALL offer a link to the next 24 that continues after the last piece shown, in the same filtered and sorted order. When no more pieces follow, the page SHALL say that the end is reached.

#### Scenario: Next page

- **WHEN** a gallery of 30 pieces is open and the visitor follows the next-page link
- **THEN** the remaining 6 pieces are shown and the page says the end is reached

### Requirement: Filters from the address

The home page SHALL apply the filters and sort the address carries. It SHALL name every active filter, people by name, each with a link that removes it, and offer newest first and oldest first. When nothing matches, it SHALL say so and offer to clear the filters.

#### Scenario: Shared filtered link

- **WHEN** a visitor opens a link filtered by a character and a tag, sorted oldest first
- **THEN** the first HTML lists the oldest 24 matching pieces and names the character, the tag and the sort as active

#### Scenario: Removing a filter

- **WHEN** the visitor follows the link on an active tag filter
- **THEN** the gallery shows the pieces matching the remaining filters, from the first page

### Requirement: Credits and tags lead to the gallery

On an artwork page, every credited person except Tigy and every tag SHALL link to the home gallery filtered by that person or tag. Tigy's credit SHALL link to the home page.

#### Scenario: Following an artist's credit

- **WHEN** a visitor follows an artist's name on an artwork page
- **THEN** the home gallery opens filtered by that artist

### Requirement: Artwork page shows the piece and its details

The artwork page SHALL show the piece, its title (or "Untitled"), description, date at the precision given, credits in order with their links, tags, the original file's format, size and dimensions, and a link to download the original, each only when set. It SHALL link to the previous and next pieces and back to the gallery.

#### Scenario: Piece with every field

- **WHEN** a visitor opens a published SFW piece with title, description, date, credits and tags
- **THEN** the page shows all of them, the image, the download link, previous, next and the link back

### Requirement: NSFW switch

The pages SHALL offer a "Show NSFW" switch, off by default and remembered only in the visitor's browser. The first HTML of every page SHALL be the switch-off view. With the switch on, the gallery and the previous and next links SHALL be reloaded with NSFW pieces after the page loads.

#### Scenario: Turning the switch on

- **WHEN** a visitor turns the switch on on the home page
- **THEN** the gallery reloads with NSFW pieces in date order, and the choice holds on the next visit in that browser

### Requirement: NSFW confirm screen

An NSFW artwork page opened with the switch off SHALL show its details behind a confirm screen, without the image, offering to show this piece or to turn the switch on. Confirming SHALL show the image without another request for the piece's data.

#### Scenario: Confirming one piece

- **WHEN** a visitor with the switch off opens an NSFW piece and chooses to show it
- **THEN** the image appears and the switch stays off

### Requirement: Link previews and the safe link

An artwork page SHALL carry its real title, description and image in link-preview metadata. With `?safe` in the address it SHALL carry only the generic site card. An NSFW artwork page SHALL offer both its link and its safe link. Every page SHALL have a title.

#### Scenario: Safe link to an NSFW piece

- **WHEN** a chat app fetches `/i/{id}?safe` for an NSFW piece
- **THEN** the preview metadata names only the site, with the site's own image and no detail of the piece

### Requirement: Crawlers stay out of NSFW pages and data

NSFW artwork pages SHALL tell search engines not to index them, with or without `?safe`. `robots.txt` SHALL disallow `/api/`.

#### Scenario: Search engines

- **WHEN** a crawler fetches an NSFW artwork page or `robots.txt`
- **THEN** the page carries a `noindex` instruction and `robots.txt` disallows `/api/`

### Requirement: Pages are cached briefly

Every page, and every not-found page, SHALL allow shared caches to keep it for at most 5 minutes, and browsers to keep none, so a change reaches visitors within 10 minutes.

#### Scenario: Cache header on a page

- **WHEN** the CDN fetches the home page
- **THEN** the response allows a shared cache to keep it for 5 minutes

### Requirement: Images are served from the site's address

Thumbnails, full images and originals SHALL be served from the public site's own address for an artwork's ID, cacheable by the CDN, so faraway visitors receive them from the edge. A file that does not exist SHALL return 404.

#### Scenario: Thumbnail of a piece

- **WHEN** the gallery shows a piece
- **THEN** its thumbnail is loaded from the public site's address for that piece

### Requirement: The browser reuses the server's data

When a page hydrates in the browser, it SHALL reuse the data the server fetched to render it and SHALL NOT request the same data again.

#### Scenario: Hydration

- **WHEN** a visitor with the switch off opens an artwork page
- **THEN** the browser makes no request to the data endpoints while the page becomes interactive

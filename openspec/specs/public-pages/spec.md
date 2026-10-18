# public-pages Specification

## Purpose

Defines the public site's pages before styling: which addresses exist, what the home and artwork pages show and link to, how the NSFW switch and confirm screen behave, and how pages, previews, crawlers, images and avatars are served.

## Requirements

### Requirement: Public addresses
The public site SHALL serve the home page at `/`, an artwork's page at `/i/{id}`, `/sitemap.xml`, `/robots.txt`, image files under `/img/` and avatars under `/avatars/`. People and tags SHALL NOT have pages of their own. Every other address, and an artwork that does not exist or is not published, SHALL render the not-found page with HTTP status 404 and a link to the home page.

#### Scenario: Unknown address
- **WHEN** a visitor opens `/no-such-page` or `/p/tigy`
- **THEN** the not-found page is shown with status 404 and a link home

#### Scenario: Unpublished artwork link
- **WHEN** a visitor opens the address of an unpublished artwork
- **THEN** the not-found page is shown with status 404

### Requirement: Home page lists the gallery
The home page SHALL show the home header (Tigy's name, avatar and social links, and the count and date range of the pieces the visitor may see) and the first page of the gallery, each piece linking to its artwork page and shown at its own shape. Without Tigy's person the header SHALL show just the name "Tigy"; without any piece it SHALL leave out the count and date range and say "No art yet."

#### Scenario: Visitor opens the home page
- **WHEN** a visitor with the NSFW switch off opens `/`
- **THEN** the first HTML contains the header and the 24 newest SFW pieces, each linking to `/i/{id}`

#### Scenario: No art yet
- **WHEN** a visitor opens `/` before any piece is published
- **THEN** the page shows the header without a count or date range, and the gallery says "No art yet."

### Requirement: Loading more pieces
When more pieces follow, the home page SHALL offer to load more, which appends the next page after the last piece shown, in the same filtered and sorted order, without changing the page's address. When no more pieces follow, the page SHALL say that the end is reached.

#### Scenario: Loading more
- **WHEN** a gallery of 30 pieces is open and the visitor chooses to load more
- **THEN** the remaining 6 pieces appear below the first 24, and the page says the end is reached

#### Scenario: The address stays shareable
- **WHEN** a visitor has loaded more pieces and copies the page's address
- **THEN** the address carries only the filters and sort, and opens the gallery from its first piece

### Requirement: Filters from the address
The home page SHALL apply the filters and sort the address carries. It SHALL name every active filter, people by name and a person who does not exist as "Unknown person", each with a link that removes it, and offer newest first and oldest first. When nothing matches, it SHALL say so and offer to clear the filters.

#### Scenario: Shared filtered link
- **WHEN** a visitor opens a link filtered by a character and a tag, sorted oldest first
- **THEN** the first HTML lists the oldest 24 matching pieces and names the character, the tag and the sort as active

#### Scenario: Removing a filter
- **WHEN** the visitor follows the link on an active tag filter
- **THEN** the gallery shows the pieces matching the remaining filters, from the first piece

#### Scenario: Unknown person
- **WHEN** a visitor opens a gallery link filtered by a person ID that matches nobody
- **THEN** the page names the filter "Unknown person" with a link that removes it, says nothing matches and offers to clear the filters

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

### Requirement: Downloading the original
The download link SHALL save the original under the piece's title in lowercase, with words joined by hyphens, or `tigy-{id}` when it has no title, followed by the original's extension.

#### Scenario: Download name
- **WHEN** a visitor downloads the original of "Hey Pookie!", a PNG
- **THEN** the browser saves it as `hey-pookie.png`

### Requirement: Back to the gallery
The link back SHALL return to the gallery address, with its filters and sort, from which the visitor opened artwork pages in this browser tab, also after moving through previous and next. Without such a gallery it SHALL lead to the home page.

#### Scenario: Back to a filtered gallery
- **WHEN** a visitor opens a piece from the gallery filtered by a character, moves to the next piece and follows the link back
- **THEN** the gallery opens filtered by that character

#### Scenario: Arriving from a shared link
- **WHEN** a visitor opens an artwork link in a new tab and follows the link back
- **THEN** the home page opens

### Requirement: NSFW switch
The pages SHALL offer a "Show NSFW" switch, off by default and remembered only in the visitor's browser. The first HTML of every page SHALL be the switch-off view. With the switch on, the page SHALL show that view at once and then replace the gallery, or the previous and next links, with the NSFW-inclusive ones once they arrive.

#### Scenario: Turning the switch on
- **WHEN** a visitor turns the switch on on the home page
- **THEN** the gallery reloads from its first piece with NSFW pieces in date order, and the choice holds on the next visit in that browser

#### Scenario: Switch already on
- **WHEN** a visitor whose switch is on opens the home page
- **THEN** the SFW gallery shows at once and is replaced by the NSFW-inclusive gallery when it arrives

### Requirement: NSFW confirm screen
An NSFW artwork page opened with the switch off SHALL show its details behind a confirm screen, without the image, offering to show this piece or to turn the switch on. Showing this piece SHALL reveal the image without another request for the piece's data and SHALL be remembered for that piece until the browser session ends.

#### Scenario: Confirming one piece
- **WHEN** a visitor with the switch off opens an NSFW piece and chooses to show it
- **THEN** the image appears and the switch stays off

#### Scenario: Coming back to a confirmed piece
- **WHEN** the visitor returns to that piece later in the same browser session
- **THEN** the image shows without asking again

### Requirement: Page titles
Every page, including artwork and not-found pages, SHALL have the title "Tigy", so tabs, history and bookmarks never show a piece's title.

#### Scenario: Title of an NSFW piece
- **WHEN** a visitor opens an NSFW artwork page
- **THEN** the browser tab says "Tigy"

### Requirement: Link previews and the safe link
An artwork page SHALL carry its real title, description and full image in link-preview metadata. With `?safe` in the address, and on the home and not-found pages, it SHALL carry only the site card: the name "Tigy", the description "Tigy" and Tigy's avatar as a small card. An NSFW artwork page SHALL offer both its link and its safe link.

#### Scenario: Safe link to an NSFW piece
- **WHEN** a chat app fetches `/i/{id}?safe` for an NSFW piece
- **THEN** the preview metadata carries only the site card, with no title, description or image of the piece

### Requirement: Crawlers stay out of NSFW pages, files and data
NSFW artwork pages SHALL tell search engines not to index them, with or without `?safe`, and so SHALL every image file of an NSFW piece. `robots.txt` SHALL disallow `/api/` and name the sitemap.

#### Scenario: Search engines
- **WHEN** a crawler fetches an NSFW artwork page, one of its image files or `robots.txt`
- **THEN** the page and the file carry a `noindex` instruction, and `robots.txt` disallows `/api/` and names `/sitemap.xml`

### Requirement: Sitemap
`/sitemap.xml` SHALL list the home page and every published SFW artwork page, and SHALL NOT list NSFW or unpublished pieces.

#### Scenario: Sitemap contents
- **WHEN** a crawler fetches `/sitemap.xml` while the gallery holds published SFW, published NSFW and unpublished pieces
- **THEN** it lists the home page and only the published SFW pieces

### Requirement: Pages are cached briefly
Every page, the sitemap and every not-found page SHALL allow shared caches to keep it for at most 5 minutes, and browsers to keep none, so a change reaches visitors within 10 minutes.

#### Scenario: Cache header on a page
- **WHEN** the CDN fetches the home page
- **THEN** the response allows a shared cache to keep it for 5 minutes

### Requirement: Images are served from the site's address
Thumbnails, full images and originals SHALL be served from the public site's own address for an artwork's ID. Shared caches SHALL keep them for at most 10 minutes and browsers for a day, so a deleted piece's files stop loading for everyone else within 10 minutes. A file that does not exist SHALL return 404.

#### Scenario: Thumbnail of a piece
- **WHEN** the gallery shows a piece
- **THEN** its thumbnail is loaded from the public site's address for that piece

#### Scenario: Files of a deleted piece
- **WHEN** the owner deletes a published piece
- **THEN** within 10 minutes its files return 404 from the site's address

### Requirement: Avatars are served from the site's address
A person's avatar SHALL be one square image served at `/avatars/{id}.webp`, cached like the images, and SHALL return 404 when the person has none. Avatars SHALL be fetchable but not listable.

#### Scenario: Tigy's avatar
- **WHEN** the home page shows Tigy's avatar
- **THEN** it loads from `/avatars/tigy.webp`

### Requirement: The browser reuses the server's data
When a page hydrates in the browser, it SHALL reuse the data the server fetched to render it and SHALL NOT request the same data again.

#### Scenario: Hydration
- **WHEN** a visitor with the switch off opens an artwork page
- **THEN** the browser makes no request to the data endpoints while the page becomes interactive

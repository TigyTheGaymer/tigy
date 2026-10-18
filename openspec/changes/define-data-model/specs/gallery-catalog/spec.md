# Spec Delta

## Purpose

Defines how artworks and the people credited on them are stored, and how the public site lists, filters, sorts and pages published artworks while keeping NSFW pieces out of sight by default.

## ADDED Requirements

### Requirement: Only published artworks are public
The public site SHALL list, count and open only artworks marked published. An unpublished artwork SHALL NOT appear in any list, count, date range, timeline or filter choice, and its artwork page SHALL show the not-found page to every visitor.

#### Scenario: Unpublished artwork
- **WHEN** the owner saves an artwork without publishing it
- **THEN** the gallery, the piece count and the filter choices do not include it, and opening its link shows the not-found page

#### Scenario: Publishing later
- **WHEN** the owner publishes a previously unpublished artwork
- **THEN** it appears in the gallery, the count and the date range within 10 minutes

### Requirement: Filters combine
The gallery SHALL accept filters by character, artist, tag and year, any of them at the same time. A piece SHALL be listed only when it matches every active filter.

#### Scenario: Character, artist and year together
- **WHEN** a visitor filters by one character, one artist and the year 2025
- **THEN** the gallery lists only pieces from 2025 that credit that artist and show that character

#### Scenario: No matches
- **WHEN** no piece matches the active filters
- **THEN** the gallery shows that nothing matches and offers to clear the filters

### Requirement: Artwork dates may be partial
An artwork SHALL have no date, a year, a year and month, or a full date. Pages SHALL show only the precision given.

#### Scenario: Year only
- **WHEN** an artwork is dated 2019 with no month or day
- **THEN** its artwork page shows "2019" and the year filter for 2019 includes it

### Requirement: Sorting applies to every matching piece
The gallery SHALL sort newest first by default and SHALL also offer oldest first. The sort SHALL apply to all matching pieces before any page is shown. A piece SHALL sort by the first day of its date's period, or by the day it was added when it has no date. Pieces with the same sort day SHALL always appear in the same order.

#### Scenario: Oldest first with a filter
- **WHEN** a visitor filters by a character and chooses oldest first
- **THEN** the first piece shown is the oldest piece with that character, even if it would only appear on the last page of the newest-first gallery

#### Scenario: Undated piece
- **WHEN** a piece has no artwork date and was added on 2025-11-20
- **THEN** it sorts as if it were dated 2025-11-20

#### Scenario: Partly dated piece
- **WHEN** a piece is dated April 2021
- **THEN** it sorts as if it were dated 2021-04-01

### Requirement: Pages continue the same order
The gallery SHALL show matching pieces 24 at a time. Each further page SHALL continue after the last piece the visitor already has, in the same filtered and sorted order, with no piece repeated or skipped, even when artworks are published or unpublished in between. Changing a filter or the sort SHALL start again at the first page.

#### Scenario: Scrolling to the second page
- **WHEN** a filter matches 30 pieces and the visitor scrolls past the first 24
- **THEN** the remaining 6 pieces load in the same order, and the gallery shows that it has reached the end

#### Scenario: A piece is published while scrolling
- **WHEN** a visitor has loaded the first 24 pieces and the owner publishes a new piece before the visitor scrolls further
- **THEN** the next page starts with the piece that followed the 24th, with none repeated

#### Scenario: Changing the sort after scrolling
- **WHEN** a visitor has loaded two pages and switches from newest first to oldest first
- **THEN** the gallery starts again with the first 24 pieces in the new order

### Requirement: Filtered links are complete pages
The page address SHALL carry the active filters and sort. Opening such an address SHALL return a server-rendered page whose first HTML already lists the first page of the filtered, sorted pieces and names each active filter.

#### Scenario: Shared filtered link
- **WHEN** a visitor opens a link to the gallery filtered by a character and a tag and sorted oldest first
- **THEN** the first HTML contains the oldest 24 matching pieces, and the filter row shows the character by name, the tag and the sort as active

### Requirement: NSFW pieces stay out of lists by default
NSFW pieces SHALL be left out of every list, count shown to the visitor, date range, timeline and filter choice unless the visitor has turned the NSFW switch on. A tag, person or year that appears only on NSFW pieces SHALL NOT be offered as a filter choice while the switch is off. The first HTML of any list SHALL NOT contain NSFW pieces or their titles. With the switch on, lists SHALL include NSFW pieces in their sorted place.

#### Scenario: Switch off
- **WHEN** a visitor with the switch off opens the gallery
- **THEN** no NSFW piece, title or link appears in the page, including its source, and the header count leaves NSFW pieces out

#### Scenario: Tag used only on NSFW pieces
- **WHEN** a tag is used only on NSFW pieces and a visitor with the switch off opens the Tags picker
- **THEN** the picker does not offer that tag

#### Scenario: Switch on
- **WHEN** a visitor turns the switch on
- **THEN** the gallery reloads its list with NSFW pieces included in date order

### Requirement: Previous and next follow the gallery
An artwork page SHALL offer the previous and next pieces in the whole gallery's newest-first order. Pieces the visitor may not see SHALL be skipped: NSFW pieces while the switch is off.

#### Scenario: Next skips an NSFW piece
- **WHEN** a visitor with the switch off opens a piece whose next neighbour in date order is NSFW
- **THEN** next leads to the nearest following piece that is not NSFW

### Requirement: Artwork links preview by default
A shared artwork link SHALL show the artwork's title and image in link previews, NSFW pieces included. A safe variant of the link SHALL show a generic site preview with no title, image or other detail of the piece. For an NSFW piece, the share menu SHALL offer both links. NSFW artwork pages SHALL NOT be indexed by search engines and SHALL NOT be listed in any sitemap, whichever link is used.

#### Scenario: Default link to an NSFW piece
- **WHEN** someone posts the default link to an NSFW piece in a chat app
- **THEN** the preview shows the piece's title and image

#### Scenario: Safe link to an NSFW piece
- **WHEN** someone posts the safe link to an NSFW piece
- **THEN** the preview shows only the generic site card

#### Scenario: Search engines
- **WHEN** a search engine crawls an NSFW artwork page through either link
- **THEN** the page tells it not to index the page

### Requirement: NSFW artwork pages ask first
Opening an NSFW artwork page with the switch off SHALL show the confirm screen, whichever link was used, and SHALL NOT load the image until the visitor confirms or turns the switch on. Confirming SHALL show the piece and its details without another request to the server.

#### Scenario: Opening an NSFW link with the switch off
- **WHEN** a visitor with the switch off opens the default link to an NSFW piece
- **THEN** the page shows the confirm screen, the image is not loaded, and confirming shows the piece with its credits

### Requirement: Credits keep their order and show current details
An artwork SHALL credit its artists and characters as people, in an order the owner sets; either list may be empty, for example when an old commission's artist is unknown. The artwork page SHALL show each credited person's current name and links, so editing a person changes every artwork that credits them without editing the artworks, and SHALL leave out an empty list.

#### Scenario: Piece without credits
- **WHEN** the owner saves an artwork with no artists and no characters
- **THEN** it is saved, and its artwork page shows neither an artists nor a characters section

#### Scenario: Credit order
- **WHEN** the owner credits two artists with the lead artist first
- **THEN** the artwork page lists the lead artist first

#### Scenario: Editing a person
- **WHEN** the owner changes an artist's social link
- **THEN** every artwork crediting that artist shows the new link within 10 minutes

### Requirement: People and artworks are addressed by ID
A person's page address and a person filter SHALL identify the person by a stable ID, and an artwork's address SHALL identify the artwork by its ID, so renaming a person or retitling an artwork never breaks a shared link.

#### Scenario: Renaming a person
- **WHEN** the owner renames a character whose page and gallery filter were shared earlier
- **THEN** both shared links still open that character, showing the new name

### Requirement: Credited people cannot be deleted
The admin SHALL refuse to delete a person who is credited on any artwork, published or not, and SHALL say which artworks credit them. If an artwork still references a person who no longer exists, the artwork page SHALL leave that credit out and still render.

#### Scenario: Deleting a credited artist
- **WHEN** the owner tries to delete an artist credited on three artworks
- **THEN** the admin refuses and names the three artworks

#### Scenario: Missing person
- **WHEN** an artwork references a person that cannot be found
- **THEN** the artwork page renders without that credit

### Requirement: Deleting an artwork removes it entirely
The owner SHALL be able to delete an artwork. Deleting it SHALL remove it from every list and SHALL remove its files, so none of them can be opened afterwards.

#### Scenario: Deleting a published artwork
- **WHEN** the owner deletes a published artwork
- **THEN** within 10 minutes it is gone from the gallery and its page shows not found, and its thumbnail, full image and original no longer load

### Requirement: Tigy is the site's own person
Exactly one person SHALL be the site's own: Tigy. A credit for Tigy SHALL link to the home page and show no social links, and Tigy's person page address SHALL lead to the home page. The home header's avatar and the owner's social links SHALL come from that person.

#### Scenario: Tigy credited as a character
- **WHEN** an artwork credits Tigy as a character
- **THEN** the credit links to the home page and shows no social links

#### Scenario: Owner edits a social link
- **WHEN** the owner changes a link on Tigy's person in the admin
- **THEN** the home header shows the new link within 10 minutes

### Requirement: Gallery overview covers every visible piece
The home header's piece count and date range, the year marks of the timeline and the filter choices SHALL reflect every published piece the visitor may see, not only the pages loaded so far.

#### Scenario: Timeline before scrolling
- **WHEN** a visitor opens the home page and only the first 24 pieces are loaded
- **THEN** the timeline already marks every year that has a visible published piece

### Requirement: Tags are flat and reused
Tags SHALL be plain words or phrases with no groups, stored trimmed, single-spaced and lowercase, so two spellings that differ only in case or spacing are the same tag. When the owner tags an artwork, the admin SHALL suggest the tags already used on any artwork, published or not, as they type.

#### Scenario: Tag suggestions
- **WHEN** the owner types "ref" in an artwork's tags
- **THEN** the admin suggests the existing tag "reference sheet"

#### Scenario: Case and spacing
- **WHEN** the owner enters " Reference  Sheet" on an artwork
- **THEN** it is saved as the existing tag "reference sheet"

### Requirement: The owner sees full counts
The admin SHALL show how many artworks are published and not NSFW, published and NSFW, and unpublished.

#### Scenario: Counts in the admin
- **WHEN** the owner has 290 published SFW, 22 published NSFW and 5 unpublished artworks
- **THEN** the admin shows 290, 22 and 5, while the public header with the switch off shows 290

### Requirement: Visitors cannot read the database directly
Visitors' browsers SHALL NOT be able to read or write people, artworks, the gallery overview or the tag list in the database directly. Public pages and gallery pages SHALL get their data only from the site's own server. Only the signed-in owner SHALL be able to change people and artworks. The server's data endpoints SHALL NOT be indexed by search engines.

#### Scenario: Direct database read
- **WHEN** someone uses the site's public configuration to query the artworks collection from a browser
- **THEN** the database refuses the read

#### Scenario: Crawling the data endpoints
- **WHEN** a search engine requests a gallery data endpoint
- **THEN** the response tells it not to index it

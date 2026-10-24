## MODIFIED Requirements

### Requirement: Artwork page shows the piece and its details
The artwork page SHALL show the piece, as its image or, for a video, as a player, its title (or "Untitled"), description, date at the precision given or, for a piece without a date, the day it was added marked as such, credits in order with their links, tags, the original file's format, size and dimensions, and a link to download the original, each only when set. It SHALL link to the previous and next pieces and back to the gallery.

#### Scenario: Piece with every field
- **WHEN** a visitor opens a published SFW piece with title, description, date, credits and tags
- **THEN** the page shows all of them, the image, the download link, previous, next and the link back

#### Scenario: Piece without a date
- **WHEN** a visitor opens a piece without a date that was added on 20 Nov 2025
- **THEN** the page shows "Added 20 Nov 2025"

#### Scenario: Video piece
- **WHEN** a visitor opens a published video piece
- **THEN** the page shows a player in place of the image, with the same details, download link and links to previous, next and the gallery

### Requirement: Downloading the original
The download link SHALL save the original under the piece's title in lowercase, with words joined by hyphens, or `tigy-{id}` when it has no title, followed by the original's extension.

#### Scenario: Download name
- **WHEN** a visitor downloads the original of "Hey Pookie!", a PNG
- **THEN** the browser saves it as `hey-pookie.png`

#### Scenario: Video download
- **WHEN** a visitor downloads the original of "Hey Pookie!", a MOV
- **THEN** the browser saves it as `hey-pookie.mov`, with its metadata removed

### Requirement: NSFW confirm screen
An NSFW artwork page opened with the switch off SHALL show its details behind a confirm screen, without the image or video, offering to show this piece or to turn the switch on. Both choices SHALL go through the age check first and take effect only when it passes. Showing this piece SHALL reveal the image or video without another request for the piece's data and SHALL be remembered for that piece until the browser session ends.

#### Scenario: Confirming one piece
- **WHEN** a visitor with the switch off who has passed the age check opens an NSFW piece and chooses to show it
- **THEN** the image appears and the switch stays off

#### Scenario: Confirming one piece for the first time
- **WHEN** a visitor who has never passed the age check chooses to show an NSFW piece
- **THEN** the age check dialog opens, and the image appears only once the check passes, with the switch still off

#### Scenario: Showing NSFW everywhere for the first time
- **WHEN** a visitor who has never passed the age check chooses to show NSFW everywhere
- **THEN** the age check dialog opens, and the switch turns on and the image appears only once the check passes

#### Scenario: Coming back to a confirmed piece
- **WHEN** the visitor returns to that piece later in the same browser session
- **THEN** the image shows without asking again

#### Scenario: NSFW video behind the confirm screen
- **WHEN** a visitor with the switch off opens an NSFW video piece
- **THEN** the confirm screen shows, and neither its video, its preview nor its still images are loaded until the visitor confirms

### Requirement: Crawlers stay out of NSFW pages, files and data
NSFW artwork pages SHALL tell search engines not to index them, with or without `?safe`, and so SHALL every image and video file of an NSFW piece. `robots.txt` SHALL disallow `/api/` and name the sitemap.

#### Scenario: Search engines
- **WHEN** a crawler fetches an NSFW artwork page, one of its image files or `robots.txt`
- **THEN** the page and the file carry a `noindex` instruction, and `robots.txt` disallows `/api/` and names `/sitemap.xml`

#### Scenario: NSFW video files
- **WHEN** a crawler fetches the web copy, the preview or the original of an NSFW video piece
- **THEN** each response carries a `noindex` instruction

### Requirement: Images are served from the site's address
Thumbnails, full images, a video's web copy and preview, and originals SHALL be served from the public site's own address for an artwork's ID. Shared caches SHALL keep them for at most 10 minutes and browsers for a day, so a deleted piece's files stop loading for everyone else within 10 minutes. A file that does not exist SHALL return 404. Every file SHALL answer a request for a byte range with that range alone.

#### Scenario: Thumbnail of a piece
- **WHEN** the gallery shows a piece
- **THEN** its thumbnail is loaded from the public site's address for that piece

#### Scenario: Files of a deleted piece
- **WHEN** the owner deletes a published piece
- **THEN** within 10 minutes its files return 404 from the site's address

#### Scenario: Range request
- **WHEN** a browser asks for bytes 1,000,000 to 1,999,999 of a video's web copy
- **THEN** the site answers with status 206 and exactly those bytes, saying the file's full size

#### Scenario: Range beyond the end
- **WHEN** a browser asks for a byte range that starts after the end of a file
- **THEN** the site answers with status 416 and the file's full size

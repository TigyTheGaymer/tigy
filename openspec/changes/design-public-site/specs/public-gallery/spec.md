# Spec Delta

## ADDED Requirements

### Requirement: Home header with social links
The home page SHALL open with a header showing Tigy's avatar, the name, a short bio, the number of published pieces and the owner's social links. The public site SHALL have no footer.

#### Scenario: Visitor opens the home page
- **WHEN** a visitor opens the home page
- **THEN** the header shows the avatar, the name, the bio, the piece count and the social links above the gallery

#### Scenario: No footer
- **WHEN** a visitor scrolls to the end of the home page or opens an artwork page
- **THEN** there is no footer and the social links are not repeated

### Requirement: Social links show the network's logo
Each social link SHALL show its network's logo in a single colour, the colour of the link's text, together with the handle. On phone-sized screens each link SHALL show only the logo. Every social link SHALL have an accessible name made of the network and the handle.

#### Scenario: Wide screen
- **WHEN** a visitor views the social links on a desktop screen
- **THEN** each link shows the network's logo and the handle

#### Scenario: Phone
- **WHEN** a visitor views the social links on a phone
- **THEN** each link shows only the logo, and a screen reader announces it as the network and the handle

### Requirement: Thumbnails keep the piece's shape
Gallery thumbnails SHALL show each piece whole at its own aspect ratio and SHALL NOT crop pieces to a fixed shape. Pieces with transparency SHALL be shown on a solid backdrop.

#### Scenario: Tall comic
- **WHEN** the gallery shows a tall three-panel comic
- **THEN** its thumbnail is tall and shows all three panels

#### Scenario: Transparent sticker
- **WHEN** the gallery shows a sticker with a transparent background
- **THEN** the whole sticker is visible on a solid backdrop

### Requirement: One continuous gallery
The gallery SHALL list published pieces newest first as one continuous run, with no headings that group pieces by year or month.

#### Scenario: Pieces from several years
- **WHEN** the published pieces span two years
- **THEN** they appear in one run, newest first, without year or month headings

### Requirement: Gallery loads more as the visitor scrolls
When the visitor scrolls near the end of the loaded gallery, the next page of pieces SHALL load without the visitor pressing a button. When every published piece is shown, the gallery SHALL say that it has reached the end.

#### Scenario: Scrolling near the end
- **WHEN** a visitor scrolls close to the last loaded piece and more pieces exist
- **THEN** the next page of pieces loads and appears below

#### Scenario: Everything loaded
- **WHEN** every published piece is shown
- **THEN** no more pages load and the gallery shows that it has reached the end

### Requirement: Returning to the gallery restores the visitor's place
After a visitor opens a piece from the gallery and goes back, the gallery SHALL show the same loaded pieces at the same scroll position.

#### Scenario: Back from a piece
- **WHEN** a visitor has loaded three pages, opens a piece from the third page and then goes back
- **THEN** the gallery shows the three pages again, scrolled to where the visitor left it

### Requirement: Scroll timeline
On wide screens the home page SHALL show a timeline along the edge that displays the scroll progress, marks where each year begins and lets the visitor jump through the gallery by clicking or dragging it. It SHALL appear beside the browser's own scrollbar, not replace it. On phones a progress bar SHALL run along the bottom edge.

#### Scenario: Dragging the timeline
- **WHEN** a visitor on a desktop screen drags the timeline to the 2025 mark
- **THEN** the gallery scrolls to the pieces from 2025

#### Scenario: Phone
- **WHEN** a visitor scrolls the home page on a phone
- **THEN** a progress bar along the bottom edge fills with the scroll progress

### Requirement: Moving between pieces on the artwork page
The artwork page SHALL offer the previous and next piece in gallery order through on-screen buttons, the left and right arrow keys and a horizontal swipe. The Escape key SHALL return to the gallery when the full view is closed.

#### Scenario: Arrow key
- **WHEN** a visitor on an artwork page presses the right arrow key
- **THEN** the next piece in gallery order opens

#### Scenario: Swipe on a phone
- **WHEN** a visitor swipes left on the piece
- **THEN** the next piece in gallery order opens

#### Scenario: First piece
- **WHEN** a visitor views the newest piece
- **THEN** no previous button is offered

### Requirement: Full view with zoom
The artwork page SHALL open the original file in a full view that fills the screen, where the visitor can zoom in and out, return to the fitted size and move the zoomed piece by dragging or pinching. Escape SHALL close the full view.

#### Scenario: Zooming into a reference sheet
- **WHEN** a visitor opens the full view of a reference sheet and zooms in
- **THEN** the original is shown larger and can be moved by dragging

#### Scenario: Closing
- **WHEN** a visitor presses Escape in the full view
- **THEN** the full view closes and the artwork page is shown again

### Requirement: Credits panel on the artwork page
The artwork page SHALL show the piece's title, description, date, artists with their links, characters with their owners and links, tags, set and other versions, and the original file's format, size and dimensions, each only when set. On wide screens the panel SHALL sit beside the piece and can be closed; on narrower screens it SHALL sit below the piece.

#### Scenario: Wide screen
- **WHEN** a visitor opens an artwork page on a desktop screen
- **THEN** the credits panel is shown beside the piece, and the visitor can close and reopen it

#### Scenario: Piece with only an image
- **WHEN** a visitor opens a piece that has no title, credits or tags
- **THEN** the panel shows "Untitled" and the date it was added, without empty fields

### Requirement: Sharing a piece
The artwork page SHALL let the visitor share the piece's address through the device's share sheet where available, and otherwise copy the address and confirm that it was copied.

#### Scenario: Desktop without a share sheet
- **WHEN** a visitor presses Share on a desktop browser without a share sheet
- **THEN** the piece's address is copied and a confirmation appears

### Requirement: Theme switch
The visitor SHALL be able to choose Automatic, Light or Dark, where Automatic follows the device's setting. The choice SHALL be remembered in the visitor's browser and applied before the page is first shown, so the other theme never flashes.

#### Scenario: Choosing Dark
- **WHEN** a visitor on a device set to light mode chooses Dark and later opens another page
- **THEN** the other page opens in the dark theme from its first paint

#### Scenario: Automatic
- **WHEN** a visitor has never chosen a theme
- **THEN** the site follows the device's light or dark setting

### Requirement: Filter controls are shown as coming later
The gallery SHALL show the planned filter controls (Characters, Artists, Tags, Year) marked as not yet available, and using them SHALL NOT change the gallery.

#### Scenario: Pressing a filter
- **WHEN** a visitor presses the Tags filter
- **THEN** the gallery does not change, and the control indicates that filters are coming later

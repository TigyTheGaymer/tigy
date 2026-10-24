# public-gallery Specification

## Purpose

Defines the public site's designed browsing experience on top of its pages: the home header and social links, the gallery's layout, place and timeline, the artwork viewer and credits panel, sharing, the theme switch and the filter row.

## Requirements

### Requirement: Home header with social links
The home page SHALL open with a header showing Tigy's avatar, the name, the bio "A tiger", the number of published pieces and the owner's social links. The public site's only footer SHALL be the privacy footer, which holds nothing but the link to the privacy page.

#### Scenario: Visitor opens the home page
- **WHEN** a visitor opens the home page
- **THEN** the header shows the avatar, the name, the bio, the piece count and the social links above the gallery

#### Scenario: No footer
- **WHEN** a visitor scrolls to the end of the home page or opens an artwork page
- **THEN** the only footer is the privacy footer, and the social links are not repeated

### Requirement: Social links show the network's logo
Each social link, in the home header and on credits, SHALL show its network's logo in a single colour, the colour of the link's text, together with the handle; a network without a logo SHALL show a generic link icon. On phone-sized screens each header link SHALL show only the icon. Every social link SHALL have an accessible name made of the network and the handle.

#### Scenario: Wide screen
- **WHEN** a visitor views the social links on a desktop screen
- **THEN** each link shows the network's logo and the handle

#### Scenario: Phone
- **WHEN** a visitor views the social links on a phone
- **THEN** each link shows only the logo, and a screen reader announces it as the network and the handle

#### Scenario: Network without a logo
- **WHEN** an artist's credit links to a network the site has no logo for
- **THEN** the link shows a generic link icon and the handle, and is announced as the network and the handle

### Requirement: Thumbnails keep the piece's shape
Gallery thumbnails SHALL show each piece whole at its own aspect ratio and SHALL NOT crop pieces to a fixed shape. Pieces with transparency SHALL be shown on a solid backdrop.

#### Scenario: Tall comic
- **WHEN** the gallery shows a tall three-panel comic
- **THEN** its thumbnail is tall and shows all three panels

#### Scenario: Transparent sticker
- **WHEN** the gallery shows a sticker with a transparent background
- **THEN** the whole sticker is visible on a solid backdrop

### Requirement: Thumbnail title label
When a visitor hovers a gallery thumbnail or moves keyboard focus to it, the thumbnail SHALL show the piece's title in a label. A piece without a title SHALL show no label, and SHALL NOT show "Untitled" or any other placeholder. The thumbnail's link SHALL still have an accessible name, "Untitled" for a piece without a title.

#### Scenario: Titled piece
- **WHEN** a visitor hovers the thumbnail of a piece titled "Hey Pookie!"
- **THEN** the label "Hey Pookie!" appears on the thumbnail

#### Scenario: Untitled piece
- **WHEN** a visitor hovers or focuses the thumbnail of a piece without a title
- **THEN** no label appears on the thumbnail
- **AND** screen readers announce the link as "Untitled"

### Requirement: One continuous gallery
The gallery SHALL list published pieces newest first as one continuous run, with no headings that group pieces by year or month.

#### Scenario: Pieces from several years
- **WHEN** the published pieces span two years
- **THEN** they appear in one run, newest first, without year or month headings

### Requirement: Returning to the gallery restores the visitor's place
After a visitor opens a piece from the gallery and goes back, with the page's back control or the browser's, the gallery SHALL show the same loaded pieces at the same scroll position without loading them again. A reload, a new tab or a shared link SHALL open the gallery from its first piece.

#### Scenario: Back from a piece
- **WHEN** a visitor has loaded three pages, opens a piece from the third page and then goes back
- **THEN** the gallery shows the three pages again, scrolled to where the visitor left it

#### Scenario: Reloading the gallery
- **WHEN** a visitor reloads the gallery after loading three pages
- **THEN** the gallery opens from its first piece

### Requirement: Scroll timeline
On wide screens the home page SHALL show a timeline along the edge that stands for every piece in the gallery as filtered, loaded or not, displays the scroll progress through them, marks where each year begins and lets the visitor jump by clicking or dragging it. It SHALL appear beside the browser's own scrollbar, not replace it. On phones a progress bar SHALL run along the bottom edge.

#### Scenario: Dragging the timeline
- **WHEN** a visitor on a desktop screen drags the timeline to the 2025 mark while the pieces from 2025 are not loaded yet
- **THEN** further pages load until the first piece from 2025 is shown, and the gallery scrolls to it

#### Scenario: Filtered gallery
- **WHEN** a visitor views a gallery filtered by a character
- **THEN** the timeline marks only the years of that character's pieces

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
The artwork page SHALL open a full view that fills the screen, shows the piece at once and replaces it with the original file once the original has loaded. In the full view the visitor SHALL be able to zoom in and out, return to the fitted size and move the zoomed piece by dragging or pinching. Escape SHALL close the full view.

#### Scenario: Zooming into a reference sheet
- **WHEN** a visitor opens the full view of a reference sheet and zooms in after the original has loaded
- **THEN** the original is shown larger, at its full detail, and can be moved by dragging

#### Scenario: Opening before the original arrives
- **WHEN** a visitor opens the full view of a large piece
- **THEN** the piece shows at once, and the original replaces it when it has loaded

#### Scenario: Closing
- **WHEN** a visitor presses Escape in the full view
- **THEN** the full view closes and the artwork page is shown again

### Requirement: Credits panel on the artwork page
The artwork page SHALL show the piece's title, description, date, artists with their links, characters with their links, tags, and the original file's format, size and dimensions, each only when set. On wide screens the panel SHALL sit beside the piece, open by default, and can be closed; the choice SHALL be remembered in the visitor's browser and applied before the page is first shown. On narrower screens it SHALL sit below the piece.

#### Scenario: Wide screen
- **WHEN** a visitor opens an artwork page on a desktop screen
- **THEN** the credits panel is shown beside the piece, and the visitor can close and reopen it

#### Scenario: Closed panel is remembered
- **WHEN** a visitor closes the credits panel and later opens another artwork page
- **THEN** the panel is closed from the first paint, without opening and closing again

#### Scenario: Piece with only an image
- **WHEN** a visitor opens a piece that has no title, date, credits or tags
- **THEN** the panel shows "Untitled" and "Added" with the day it was added, without empty fields

### Requirement: Sharing a piece
The artwork page SHALL let the visitor share the piece's address through the device's share sheet where available, and otherwise copy the address and confirm that it was copied. For an NSFW piece, the credits panel SHALL also offer to copy its safe link, confirming that it was copied.

#### Scenario: Desktop without a share sheet
- **WHEN** a visitor presses Share on a desktop browser without a share sheet
- **THEN** the piece's address is copied and a confirmation appears

#### Scenario: Safe link of an NSFW piece
- **WHEN** a visitor presses "Copy safe link" on an NSFW piece
- **THEN** the piece's safe link is copied and a confirmation appears

### Requirement: Theme switch
The visitor SHALL be able to choose Automatic, Light or Dark, where Automatic follows the device's setting. The choice SHALL be remembered in the visitor's browser and applied before the page is first shown, so the other theme never flashes.

#### Scenario: Choosing Dark
- **WHEN** a visitor on a device set to light mode chooses Dark and later opens another page
- **THEN** the other page opens in the dark theme from its first paint

#### Scenario: Automatic
- **WHEN** a visitor has never chosen a theme
- **THEN** the site follows the device's light or dark setting

### Requirement: Filter row
The gallery SHALL show a filter row with four filter pickers (Characters, Artists, Tags and Year), a sort chip that switches between newest and oldest first and, while any filter is active, a "Clear all" chip that removes every filter and keeps the sort. A picker with active filters SHALL show how many. Pressing a picker SHALL open its list of choices, as a dropdown under the picker on wide screens and as a sheet along the bottom edge on phones. Each choice SHALL show its name and how many pieces it has; characters and artists SHALL also show their avatar. Pressing a choice SHALL apply it at once, changing the gallery and its address, and SHALL leave the picker open. Active choices SHALL be shown as selected, and pressing one SHALL remove it. Picking a second year SHALL add it, so the gallery shows pieces from either year. The Characters, Artists and Tags pickers SHALL have a search field that narrows the list to choices whose name contains the typed text, ignoring case. Escape, a press outside the picker or its close button SHALL close it and return focus to its chip.

#### Scenario: Removing a filter chip
- **WHEN** a visitor on a gallery filtered by two characters, a tag and a year presses "Clear all"
- **THEN** the gallery shows every piece from the first, in the same sort, and no picker shows an active filter

#### Scenario: Many filters
- **WHEN** a visitor has two characters, an artist, two tags and a year active
- **THEN** the pickers show "Characters · 2", "Artists · 1", "Tags · 2" and "Year · 1", and the filter row fits without cutting anything off

#### Scenario: Pressing a picker
- **WHEN** a visitor on a wide screen presses the Tags picker
- **THEN** a dropdown opens under it listing the tags with how many pieces each has, and the gallery does not change

#### Scenario: Picking a tag
- **WHEN** a visitor opens the Tags picker and presses the tag "comic"
- **THEN** the gallery shows the pieces tagged "comic" from the first piece, the address carries the tag, the Tags picker shows one active filter, and the picker stays open with "comic" selected

#### Scenario: Picking a second character
- **WHEN** a visitor on a gallery filtered by one character picks another character in the open picker
- **THEN** the gallery shows only pieces with both characters

#### Scenario: Unpicking a choice
- **WHEN** a visitor presses a selected choice in an open picker
- **THEN** that filter is removed and the choice is no longer selected

#### Scenario: Picking a second year
- **WHEN** a visitor on a gallery filtered by 2024 picks 2025 in the Year picker
- **THEN** the gallery shows the pieces from 2024 and from 2025, and the Year picker shows "Year · 2"

#### Scenario: Searching a picker
- **WHEN** a visitor types "bra" in the Characters picker's search field
- **THEN** the list shows only characters whose name contains "bra", such as "Bramble"

#### Scenario: Picker on a phone
- **WHEN** a visitor on a phone presses the Artists picker
- **THEN** the choices open in a sheet along the bottom edge

#### Scenario: Closing a picker
- **WHEN** a visitor presses Escape in an open picker
- **THEN** the picker closes and focus returns to its chip

### Requirement: Open pickers stay steady
Picking or unpicking a choice SHALL NOT move the open picker or the choices in it. The pickers SHALL come first in the filter row. While a picker is open, its choices SHALL keep their opening order: a choice that stops matching SHALL stay in place, unavailable with 0 pieces, and a choice that starts matching SHALL go at the end.

#### Scenario: Picking keeps the list in place
- **WHEN** a visitor opens the Tags picker and picks "comic"
- **THEN** the Tags picker and its dropdown stay where they were, every tag stays in its place, and the tags not found on pieces tagged "comic" are shown as unavailable with 0 pieces

#### Scenario: Pressing an unavailable choice
- **WHEN** a visitor presses a choice shown as unavailable
- **THEN** nothing changes

#### Scenario: Reopening the picker
- **WHEN** a visitor closes the Tags picker after picking "comic" and opens it again
- **THEN** it lists only the tags found on pieces tagged "comic", with "comic" first

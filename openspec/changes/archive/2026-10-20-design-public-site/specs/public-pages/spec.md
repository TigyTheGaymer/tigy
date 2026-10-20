# Spec Delta

## MODIFIED Requirements

### Requirement: Loading more pieces
When more pieces follow, the home page SHALL load the next page as the visitor scrolls near the end of the loaded pieces, without the visitor pressing a button and without changing the page's address, appending it after the last piece shown in the same filtered and sorted order. When no more pieces follow, the page SHALL say that the end is reached.

#### Scenario: Loading more
- **WHEN** a gallery of 30 pieces is open and the visitor scrolls near the end of the first 24
- **THEN** the remaining 6 pieces appear below the first 24, and the page says the end is reached

#### Scenario: The address stays shareable
- **WHEN** a visitor has loaded more pieces and copies the page's address
- **THEN** the address carries only the filters and sort, and opens the gallery from its first piece

### Requirement: Artwork page shows the piece and its details
The artwork page SHALL show the piece, its title (or "Untitled"), description, date at the precision given or, for a piece without a date, the day it was added marked as such, credits in order with their links, tags, the original file's format, size and dimensions, and a link to download the original, each only when set. It SHALL link to the previous and next pieces and back to the gallery.

#### Scenario: Piece with every field
- **WHEN** a visitor opens a published SFW piece with title, description, date, credits and tags
- **THEN** the page shows all of them, the image, the download link, previous, next and the link back

#### Scenario: Piece without a date
- **WHEN** a visitor opens a piece without a date that was added on 20 Nov 2025
- **THEN** the page shows "Added 20 Nov 2025"

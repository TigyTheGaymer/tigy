# Spec Delta

## MODIFIED Requirements

### Requirement: Artwork links preview by default
A shared artwork link SHALL show the artwork's title and image in link previews, NSFW pieces included. A safe variant of the link SHALL show a generic site preview with no title, image or other detail of the piece. For an NSFW piece, the artwork page SHALL offer both links. NSFW artwork pages SHALL NOT be indexed by search engines and SHALL NOT be listed in any sitemap, whichever link is used.

#### Scenario: Default link to an NSFW piece
- **WHEN** someone posts the default link to an NSFW piece in a chat app
- **THEN** the preview shows the piece's title and image

#### Scenario: Safe link to an NSFW piece
- **WHEN** someone posts the safe link to an NSFW piece
- **THEN** the preview shows only the generic site card

#### Scenario: Search engines
- **WHEN** a search engine crawls an NSFW artwork page through either link
- **THEN** the page tells it not to index the page

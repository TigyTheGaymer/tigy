# Spec Delta

## ADDED Requirements

### Requirement: Thumbnail title label
When a visitor hovers a gallery thumbnail or moves keyboard focus to it, the thumbnail SHALL show the piece's title in a label. A piece without a title SHALL show no label, and SHALL NOT show "Untitled" or any other placeholder. The thumbnail's link SHALL still have an accessible name, "Untitled" for a piece without a title.

#### Scenario: Titled piece
- **WHEN** a visitor hovers the thumbnail of a piece titled "Hey Pookie!"
- **THEN** the label "Hey Pookie!" appears on the thumbnail

#### Scenario: Untitled piece
- **WHEN** a visitor hovers or focuses the thumbnail of a piece without a title
- **THEN** no label appears on the thumbnail
- **AND** screen readers announce the link as "Untitled"

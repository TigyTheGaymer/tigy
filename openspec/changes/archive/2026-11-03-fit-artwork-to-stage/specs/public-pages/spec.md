# Spec Delta

## ADDED Requirements

### Requirement: The piece fills the stage's free space
The artwork page SHALL show every image and video at the largest size that keeps its shape and fits the stage's free space, whatever its shape or file size, enlarging it when its file is smaller. No part of the piece SHALL be cut off.

#### Scenario: Small picture
- **WHEN** a visitor opens a 440×242 image on a 1440×900 screen
- **THEN** the image is shown enlarged, reaching the full width of the free space, and is not cut off

#### Scenario: Vertical picture
- **WHEN** a visitor opens a 1000×1600 image on a 1440×900 screen
- **THEN** the image reaches the full height of the free space, keeps its shape and is not cut off

#### Scenario: Wide picture
- **WHEN** a visitor opens a 2048×1000 image on a 1440×900 screen
- **THEN** the image reaches the full width of the free space, keeps its shape and is not cut off

#### Scenario: Square picture
- **WHEN** a visitor opens an 800×800 image on a 1440×900 screen
- **THEN** the image reaches the full height of the free space and stays square

#### Scenario: Small video
- **WHEN** a visitor opens a video smaller than the free space
- **THEN** the player grows to fill the free space at the video's shape, as an image would

#### Scenario: First HTML
- **WHEN** a visitor opens an artwork page without running its scripts
- **THEN** the piece is already shown at its final size

### Requirement: The stage's free space follows the page
The free space SHALL be what the stage bar and arrows leave on the stage, and the piece SHALL follow it as the window changes size or the credits panel opens or closes, without reloading the image.

#### Scenario: Closing the credits panel
- **WHEN** a visitor viewing a wide piece on a wide screen closes the credits panel
- **THEN** the piece grows to the wider free space

#### Scenario: Resizing the window
- **WHEN** a visitor makes the window smaller
- **THEN** the piece shrinks with it and is never cut off

### Requirement: Controls don't cover the piece
While the piece is at rest, neither the stage bar nor the arrows SHALL overlap it, at any screen size. On screens up to 720 px wide, the arrows SHALL sit in a row below the piece.

#### Scenario: Vertical piece under the bar
- **WHEN** a visitor opens a vertical piece that reaches the full height of the free space
- **THEN** the top of the piece starts below the stage bar

#### Scenario: Wide piece between the arrows
- **WHEN** a visitor opens a wide piece that reaches the full width of the free space
- **THEN** the piece sits between the arrows without touching them

#### Scenario: On a phone
- **WHEN** a visitor opens a piece on a 375×812 screen
- **THEN** the arrows sit below the piece and the stage bar above it, without overlapping it

### Requirement: The piece stays centred between moves
The piece SHALL be centred in the free space, and the place of a piece SHALL NOT depend on whether it has a previous or next piece.

#### Scenario: The newest piece
- **WHEN** a visitor moves between two pieces of the same shape, the first of them having no previous piece
- **THEN** the piece stays in the same place and at the same size

### Requirement: The credits stay in reach on smaller screens
On screens up to 1100 px wide, the stage SHALL stay shorter than the screen, so the start of the credits shows below it without scrolling.

#### Scenario: On a tablet
- **WHEN** a visitor opens a piece on a 768×1024 screen
- **THEN** the start of the credits shows below the stage

### Requirement: The old image keeps its shape during a move
While the new piece's image is loading, the old image SHALL keep its own shape and size, and the new shape SHALL apply when the new image has loaded or failed to load.

#### Scenario: From a wide piece to a vertical one
- **WHEN** a visitor moves from a wide piece to a vertical one whose image is still loading
- **THEN** the wide image stays at its shape, and the vertical piece takes its own shape once loaded

#### Scenario: The new image fails
- **WHEN** the new piece's image fails to load
- **THEN** the stage stops waiting and uses the new piece's shape

### Requirement: Panels sit in the free space
The NSFW confirm screen and the error message SHALL be centred in the free space, and the stage bar SHALL NOT overlap them on a screen tall enough to hold them.

#### Scenario: Confirm screen on a laptop
- **WHEN** a visitor with the switch off opens an NSFW piece on a 1440×900 screen
- **THEN** the confirm screen is centred in the free space, clear of the stage bar

### Requirement: Full view fits the piece to the screen
Before any zoom, full view SHALL show the piece at the largest size that keeps its shape and fits the screen, enlarging it when its file is smaller. Zooming and dragging SHALL keep working from that size, and dragging SHALL NOT move a zoomed piece away from an edge of the screen that it covers.

#### Scenario: Opening a small piece
- **WHEN** a visitor opens full view on a 440×242 image
- **THEN** the image fills the screen's width and is larger than it is on the page

#### Scenario: Dragging a zoomed vertical piece
- **WHEN** a visitor zooms a vertical piece until it is wider than the screen and drags it far to one side
- **THEN** the piece stops with its edge at the edge of the screen

## MODIFIED Requirements

### Requirement: Stage bar controls keep their place
The stage bar's controls SHALL keep their positions on every artwork page, whichever kind of piece it shows and while its data loads. A control that can't be used SHALL be unavailable rather than removed, and SHALL offer nothing of a piece that isn't shown.

#### Scenario: Moving from an image to a video
- **WHEN** a visitor moves from an image to a video, which has no full view
- **THEN** the Show NSFW switch and the other controls stay where they were

#### Scenario: NSFW piece behind the confirm screen
- **WHEN** an NSFW piece waits behind the confirm screen
- **THEN** the controls keep their positions, and sharing and downloading are unavailable

#### Scenario: On a phone
- **WHEN** a visitor opens an image, a video or an NSFW piece on a 375 px wide screen
- **THEN** every control fits within the screen

#### Scenario: On a small phone
- **WHEN** a visitor opens a piece on a 320 px wide screen
- **THEN** every control fits within the screen

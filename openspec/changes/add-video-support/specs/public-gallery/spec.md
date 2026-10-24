## MODIFIED Requirements

### Requirement: Full view with zoom
The artwork page of an image SHALL open a full view that fills the screen, shows the piece at once and replaces it with the original file once the original has loaded. In the full view the visitor SHALL be able to zoom in and out, return to the fitted size and move the zoomed piece by dragging or pinching. Escape SHALL close the full view. A video SHALL have no zooming full view; its player's own full-screen control takes its place.

#### Scenario: Zooming into a reference sheet
- **WHEN** a visitor opens the full view of a reference sheet and zooms in after the original has loaded
- **THEN** the original is shown larger, at its full detail, and can be moved by dragging

#### Scenario: Opening before the original arrives
- **WHEN** a visitor opens the full view of a large piece
- **THEN** the piece shows at once, and the original replaces it when it has loaded

#### Scenario: Closing
- **WHEN** a visitor presses Escape in the full view
- **THEN** the full view closes and the artwork page is shown again

#### Scenario: Video full screen
- **WHEN** a visitor uses the full-screen control of a video's player
- **THEN** the video fills the screen and keeps playing, and no zooming full view opens

### Requirement: Credits panel on the artwork page
The artwork page SHALL show the piece's title, description, date, artists with their links, characters with their links, tags, and the original file's format, size and dimensions, and for a video its duration and whether it has sound, each only when set. On wide screens the panel SHALL sit beside the piece, open by default, and can be closed; the choice SHALL be remembered in the visitor's browser and applied before the page is first shown. On narrower screens it SHALL sit below the piece.

#### Scenario: Wide screen
- **WHEN** a visitor opens an artwork page on a desktop screen
- **THEN** the credits panel is shown beside the piece, and the visitor can close and reopen it

#### Scenario: Closed panel is remembered
- **WHEN** a visitor closes the credits panel and later opens another artwork page
- **THEN** the panel is closed from the first paint, without opening and closing again

#### Scenario: Piece with only an image
- **WHEN** a visitor opens a piece that has no title, date, credits or tags
- **THEN** the panel shows "Untitled" and "Added" with the day it was added, without empty fields

#### Scenario: Video details
- **WHEN** a visitor opens a 42-second MP4 with sound
- **THEN** the panel shows its format as an MP4 video, its duration as 0:42, that it has sound, its size and its dimensions

#### Scenario: Silent video
- **WHEN** a visitor opens a video without sound
- **THEN** the panel says it is silent

## ADDED Requirements

### Requirement: Video tiles play while on screen
A video's gallery tile SHALL show its still thumbnail and, while the tile is on screen, play its silent preview in a loop, pausing when it leaves the screen. Video tiles SHALL keep the piece's shape, title label and NSFW badge like image tiles. A visitor who asks for reduced motion or less data SHALL see only the still thumbnail.

#### Scenario: Scrolling past a video
- **WHEN** a visitor scrolls a video's tile into view and then past it
- **THEN** its preview plays silently in a loop while it is on screen and stops once it has left

#### Scenario: Reduced motion
- **WHEN** a visitor whose system asks for reduced motion opens the gallery
- **THEN** video tiles show their still thumbnails and play nothing

#### Scenario: Data saver
- **WHEN** a visitor whose browser asks to save data opens the gallery
- **THEN** video tiles show their still thumbnails and no preview is downloaded

#### Scenario: Before the preview loads
- **WHEN** a video's tile comes into view on a slow connection
- **THEN** its still thumbnail shows at once at the tile's final size, and the preview replaces it without the layout moving

#### Scenario: Off-screen tiles
- **WHEN** a visitor opens a gallery page with twenty video pieces, three of them on screen
- **THEN** only those three tiles' previews are downloaded and played

### Requirement: Video player on the artwork page
A video's artwork page SHALL play its web copy in place of the image, with its still full image shown until it can play. It SHALL start playing muted and loop, and SHALL offer controls to play and pause, seek, unmute and change the volume, and go full screen. A visitor who asks for reduced motion SHALL see it paused until they press play.

#### Scenario: Opening a video piece
- **WHEN** a visitor opens the artwork page of a video with sound
- **THEN** the video plays muted in a loop, and the visitor can unmute it to hear the sound at half volume

#### Scenario: Seeking
- **WHEN** a visitor drags the player's position to the middle of a 2-minute video before it has fully loaded
- **THEN** playback continues from the middle without the whole video downloading first

#### Scenario: Reduced motion
- **WHEN** a visitor whose system asks for reduced motion opens a video piece
- **THEN** the player shows the still full image, paused, and plays only once they press play

#### Scenario: Moving to the next piece
- **WHEN** a visitor moves from a video piece to the next one
- **THEN** the video stops and its sound does not continue on the next piece

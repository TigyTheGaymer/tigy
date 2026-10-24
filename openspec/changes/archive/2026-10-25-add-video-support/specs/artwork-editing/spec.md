## MODIFIED Requirements

### Requirement: The artwork editor shows the piece and its file

Opening an artwork from the list or from its upload row SHALL show the artwork editor with the piece's full image, or for a video a player of its web copy, and its original's format, size, dimensions, whether it is animated and whether it is transparent, a video's duration and whether it has sound, and the day it was added. The editor SHALL link to the original file. For a published artwork it SHALL link to the artwork's public page. An artwork that does not exist SHALL show that it was not found, with a link to the Artworks page.

#### Scenario: Opening a published piece

- **WHEN** the owner opens a published artwork in the editor
- **THEN** the editor shows its image, its file details and a link to its page on the public site

#### Scenario: Deleted meanwhile

- **WHEN** the owner opens the editor address of an artwork that has been deleted
- **THEN** the editor says the artwork was not found and links to the Artworks page

#### Scenario: Opening a video

- **WHEN** the owner opens a 42-second MP4 with sound in the editor
- **THEN** the editor shows a muted player with controls, set to half volume, in place of the image, and its file details include the duration 0:42 and that it has sound

#### Scenario: Moving on from a playing video

- **WHEN** the owner unmutes a video in the editor and presses Save and next
- **THEN** the video stops, and its sound does not continue on the next artwork

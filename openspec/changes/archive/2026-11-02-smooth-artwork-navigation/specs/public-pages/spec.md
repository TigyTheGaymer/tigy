# Spec Delta

## ADDED Requirements

### Requirement: Moving between pieces keeps the page in place

Moving to the previous or next piece SHALL keep the artwork page in place. The current piece, its details, the arrows and the stage bar SHALL stay on screen until the new piece's data arrives, unless the delay in "Skeletons only when needed" passes first. The details and links SHALL then update where they are, and the image SHALL change once the new one has loaded.

#### Scenario: Moving to the next piece

- **WHEN** a visitor presses next while the new piece's data is on its way
- **THEN** the current image, details and arrows stay on screen and the page does not go blank

#### Scenario: Details arrive before the image

- **WHEN** the new piece's data arrives while its image is still loading
- **THEN** the details and links update, and the current image stays until the new one has loaded

#### Scenario: Keyboard focus stays on the arrow

- **WHEN** a visitor presses next from the keyboard and the new piece has a next piece too
- **THEN** focus stays on the next arrow

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

### Requirement: Skeletons only when needed

The artwork page SHALL show a skeleton for a part only while that part has nothing to show, or when a move has waited 300 ms and that part is still waiting. A part that is ready within 300 ms of a move SHALL show no skeleton. Skeletons SHALL stop once the part is ready or the load fails, and SHALL NOT animate when the visitor asks for reduced motion.

#### Scenario: Opening a piece from the gallery

- **WHEN** a visitor opens a piece from the gallery and its data is on its way
- **THEN** the stage and the credits show skeletons in place, with the stage bar around them

#### Scenario: Move at normal speed

- **WHEN** the new piece's data and image are ready within 300 ms of pressing next
- **THEN** the page shows no skeleton and goes directly from one piece to the other

#### Scenario: Slow move

- **WHEN** the new piece's data is still on its way 300 ms after pressing next
- **THEN** the stage and the credits show skeletons, and the arrows and stage bar stay in place

#### Scenario: Slow image

- **WHEN** the new piece's data has arrived and its image is still loading 300 ms after pressing next
- **THEN** the details show the new piece and only the stage shows a skeleton

#### Scenario: Direct link

- **WHEN** a visitor opens an artwork page by its address
- **THEN** the first HTML holds the finished page, without skeletons

#### Scenario: Reduced motion

- **WHEN** a visitor who asks for reduced motion sees a skeleton
- **THEN** the skeleton does not animate

### Requirement: Visited pieces show at once

A piece visited since the artwork page was opened SHALL show its details at once when the visitor moves back to it, while its data refreshes in the background, and the page SHALL update if the data has changed. What is remembered SHALL last only until the visitor leaves the artwork page and SHALL be kept apart for the switch on and off.

#### Scenario: Going back and forth

- **WHEN** a visitor moves from a piece to the next one and back
- **THEN** the first piece's details show at once, without a skeleton, one request refreshes its data, and its image follows when that answer arrives

#### Scenario: The piece changed meanwhile

- **WHEN** the refresh returns different details from those remembered
- **THEN** the page shows the new details

#### Scenario: The piece is gone

- **WHEN** the refresh finds that the piece no longer exists
- **THEN** the page renders the not-found page

### Requirement: Moves wait for the new links

While a piece's data is on its way, the arrows, arrow keys and swipes SHALL NOT move to another piece, so a move can't skip a piece or go the wrong way.

#### Scenario: Pressing next twice

- **WHEN** a visitor presses next twice before the new piece's data arrives
- **THEN** the page moves one piece on

#### Scenario: Pressing previous while on the way

- **WHEN** a visitor presses next and then previous before the new piece's data arrives
- **THEN** the page still moves to the next piece, and previous takes effect only when pressed after the data arrives

### Requirement: A move stops the playing video

A playing video SHALL pause at the moment the visitor moves to another piece, so its sound does not carry on during the wait. A video reached by moving SHALL start as a video opened directly does, muted and playing unless reduced motion is asked for.

#### Scenario: Moving away with the sound on

- **WHEN** a visitor moves on from a video playing with sound while the new piece's data is on its way
- **THEN** the sound stops at once

#### Scenario: Moving from a video to a video

- **WHEN** a visitor who turned a video's sound on moves to another video
- **THEN** the new video plays muted

### Requirement: Credits start at the top for each piece

Each new piece's details SHALL start at the top of the credits panel, wherever the previous piece's details were scrolled to.

#### Scenario: Moving after scrolling the credits

- **WHEN** a visitor scrolls down the credits panel and moves to the next piece
- **THEN** the new piece's credits show from the top

### Requirement: Files wait for the piece's data

The artwork page SHALL NOT request a piece's image or video file until that piece's data has arrived and shows the piece may be shown.

#### Scenario: Moving to an NSFW piece with the switch off

- **WHEN** a move leads to a piece whose data says it is NSFW, with the switch off and the piece not confirmed
- **THEN** the confirm screen replaces the previous piece and the browser makes no request for the new piece's image or video

#### Scenario: A visited piece was flagged NSFW meanwhile

- **WHEN** a visitor with the switch off moves back to a visited piece that has since been flagged NSFW
- **THEN** the confirm screen appears when the refresh answers, and the browser makes no request for the piece's image or video

### Requirement: Failed moves don't keep the old piece

When moving to a piece fails, the page SHALL NOT keep showing the previous piece under the new address. A piece that does not exist SHALL render the not-found page, and any other failure SHALL show the error in the stage.

#### Scenario: Moving to a deleted piece

- **WHEN** a visitor moves to a piece that has since been deleted
- **THEN** the not-found page renders

#### Scenario: Moving when the server fails

- **WHEN** the new piece's data fails to load with a server error
- **THEN** the stage shows that the piece could not be loaded, and no skeleton keeps animating

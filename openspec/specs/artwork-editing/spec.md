# artwork-editing Specification

## Purpose

Defines how the owner manages artworks in the admin: the Artworks page with its filters and counts, the artwork editor for details, credits, tags, publishing and NSFW state, actions on several artworks at once, and deleting.

## Requirements

### Requirement: Leaving the editor can save first

When the owner moves from the artwork editor to another admin page, or to the previous or next artwork, while edits are unsaved, the question SHALL offer Save and leave besides Stay and Leave. Save and leave SHALL save the edits as Save does and then go where the owner was going. When the save does not go through, the editor SHALL stay open with the edits kept and say why, as Save does.

#### Scenario: Saving on the way out

- **WHEN** the owner changes the title, opens the People page and chooses Save and leave
- **THEN** the title is stored, the editor confirms the save, and the People page opens

#### Scenario: Leaving without saving

- **WHEN** the owner changes the title, opens the People page and chooses Leave
- **THEN** the People page opens and the title is not stored

#### Scenario: Staying

- **WHEN** the owner changes the title, opens the People page and chooses Stay
- **THEN** the editor stays open with the changed title still unsaved

#### Scenario: Moving to the next artwork

- **WHEN** the owner changes the title, presses Alt+Right and chooses Save and leave
- **THEN** the title is stored and the next artwork opens

#### Scenario: Date that does not exist

- **WHEN** the owner enters 31 February, opens the People page and chooses Save and leave
- **THEN** the editor stays open, shows the date error and keeps the edits

#### Scenario: Backing out of publishing with missing details

- **WHEN** the owner publishes a piece with no artist, opens the People page, chooses Save and leave, and then Keep editing when asked about the missing details
- **THEN** nothing is stored and the editor stays open with the edits

#### Scenario: Save fails on the way out

- **WHEN** the owner chooses Save and leave and saving fails because the connection is lost
- **THEN** the editor says the edits were not saved, stays open and keeps them

#### Scenario: Closing the tab

- **WHEN** the owner closes or reloads the tab with unsaved edits
- **THEN** the browser asks with its own question, which has no Save and leave

### Requirement: The Artworks page lists every artwork

The Artworks page SHALL list every artwork, published or not, newest first in the gallery's sort order. Each entry SHALL show the thumbnail, the title or "Untitled", the date at its precision or the day it was added, and whether it is published and whether it is NSFW. The list SHALL update without reloading when an artwork is added, changed or deleted.

#### Scenario: A new upload appears

- **WHEN** the owner has the Artworks page open in one tab and an upload finishes processing in another
- **THEN** the new artwork appears in the list as unpublished and "Untitled", without the owner reloading

#### Scenario: Partial date in the list

- **WHEN** an artwork is dated April 2021
- **THEN** its entry shows "Apr 2021"

### Requirement: The Artworks page filters and searches

The Artworks page SHALL offer the views All, Unpublished, Published SFW, Published NSFW and Needs work (artworks with no artist, no title or no date, with how many there are), and a search that keeps the artworks whose title contains the typed text, ignoring case. The view and the search SHALL combine and SHALL be carried in the page address, so reloading keeps them.

#### Scenario: Unpublished pieces to work through

- **WHEN** the owner chooses Unpublished
- **THEN** only unpublished artworks are listed, newest first

#### Scenario: Search within a view

- **WHEN** the owner chooses Published NSFW and types "pool"
- **THEN** only published NSFW artworks whose title contains "pool" are listed

#### Scenario: Pieces that need work

- **WHEN** the owner chooses Needs work
- **THEN** every artwork, published or not, with no artist, no title or no date is listed with its count, each tile saying what is missing, such as "No artist · No date"

#### Scenario: Finishing a piece

- **WHEN** the owner, working through Needs work, gives a piece its missing date and saves
- **THEN** the piece leaves the Needs work view and its count drops by one

#### Scenario: Reloading a filtered list

- **WHEN** the owner reloads the Artworks page with Unpublished chosen
- **THEN** the page opens with Unpublished still chosen

### Requirement: The Artworks page shows the counts

The Artworks page SHALL show how many artworks are published and SFW, published and NSFW, and unpublished, counting every artwork whatever the view or search, and SHALL keep the counts current as artworks change.

#### Scenario: Publishing changes the counts

- **WHEN** the counts show 290, 22 and 5 and the owner publishes one unpublished SFW artwork
- **THEN** the counts show 291, 22 and 4

### Requirement: The owner uploads from the Artworks page

The Artworks page SHALL offer an Upload button and SHALL accept files dropped anywhere on it. Files SHALL be checked and uploaded as on the Uploads page, and uploads SHALL continue when the owner moves to another admin page. The Uploads page SHALL list them too.

#### Scenario: Dropping files on the list

- **WHEN** the owner drops three image files anywhere on the Artworks page
- **THEN** all three start uploading, and the Uploads page lists them too

#### Scenario: Unsupported file dropped on the list

- **WHEN** the owner drops a HEIC photo on the Artworks page
- **THEN** the admin does not upload it and says that only JPEG, PNG, GIF and WebP are supported

### Requirement: Upload tiles on the Artworks page

The Artworks page SHALL show a tile at the top of the list for each file that is uploading, with its progress, or processing, and for each failed upload with its reason, whatever the view or search. A finished upload SHALL become its artwork's tile and follow the view and search. When the current view or search hides finished uploads, the admin SHALL say so with a link to the Unpublished view. A failed tile SHALL stay until the owner dismisses it, which clears it as on the Uploads page.

#### Scenario: Uploading while viewing published pieces

- **WHEN** the owner, on the Published SFW view, uploads two files and both finish processing
- **THEN** their tiles show progress and then processing at the top, then leave the list, and the admin says that 2 artworks are ready with a link to Unpublished

#### Scenario: Upload finishing on the Unpublished view

- **WHEN** the owner, on the Unpublished view, uploads a file and it finishes processing
- **THEN** its tile becomes the new artwork's tile in its place in the list

#### Scenario: Failure while away

- **WHEN** an upload failed while the owner was on another page and the owner opens the Artworks page
- **THEN** a failed tile with the reason is at the top until the owner dismisses it, and dismissing removes its row from the Uploads page too

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

### Requirement: The editor moves through the list

The editor SHALL offer the previous and next artworks in the Artworks list the owner opened it from, with that list's view and search, or in the whole list when opened another way. Save and next SHALL save the edits and then open the artwork that followed this one before saving. Moving away with unsaved edits SHALL ask first, as leaving does.

#### Scenario: Working through unpublished pieces

- **WHEN** the owner opens the second piece from the Unpublished view and publishes it with Save and next
- **THEN** the edits are saved and the editor opens the piece that was third in the Unpublished view

#### Scenario: Opened from an upload row

- **WHEN** the owner opens an artwork from its upload row and presses next
- **THEN** the editor opens the following artwork in the whole list, newest first

#### Scenario: Last piece

- **WHEN** the owner opens the last artwork of the current view
- **THEN** next and Save and next are not offered, and Save is

### Requirement: The editor has keyboard shortcuts

The editor SHALL save with Ctrl+S (⌘S on a Mac) instead of the browser saving the page, do Save and next with Ctrl+Enter (⌘Enter), and open the previous and next artworks with Alt+Left and Alt+Right, also while a field has focus, except Alt+Left and Alt+Right inside a text box. Each button SHALL name its shortcut in its tooltip.

#### Scenario: Saving from a field

- **WHEN** the owner types a title and presses Ctrl+S
- **THEN** the edits are saved and the browser does not offer to save the page

#### Scenario: Moving on with unsaved edits

- **WHEN** the owner has unsaved edits and presses Alt+Right
- **THEN** the admin asks before moving to the next artwork

### Requirement: The owner edits a credited person from the editor

Each credit in the editor SHALL offer to edit that person in a panel over the artwork editor, with the same fields and save as the person editor. The artwork's unsaved edits SHALL stay as they were. Closing the panel with unsaved edits to the person SHALL ask first.

#### Scenario: Adding links to a new artist

- **WHEN** the owner creates "Bramble" from the Artists picker, opens Bramble's panel, adds a link and saves it
- **THEN** Bramble has the link, the panel closes, and the artwork's other unsaved edits are still there to save

#### Scenario: Closing the panel with unsaved edits

- **WHEN** the owner changes a person's name in the panel and closes it without saving
- **THEN** the admin asks before discarding the change

### Requirement: Pieces without an artist are pointed out

The Artworks page and the editor SHALL mark an artwork that credits no artist. Publishing several artworks at once SHALL ask first when any of them credits no artist, saying how many. Neither SHALL stop the owner from publishing.

#### Scenario: Tile without an artist

- **WHEN** an artwork credits no artist
- **THEN** its tile and its editor show "No artist"

#### Scenario: Publishing a batch with uncredited pieces

- **WHEN** the owner publishes five selected artworks, two of which credit no artist
- **THEN** the admin asks whether to publish although 2 of 5 have no artist credited, and confirming publishes all five

### Requirement: The owner edits an artwork's details

The editor SHALL let the owner set or clear the title, the description and the artwork date. The date SHALL be given as a year, a year and month, or a full date, and a date that does not exist SHALL be refused before saving. Clearing a field SHALL remove it, so pages show nothing for it. The title and description SHALL be stored trimmed.

#### Scenario: Year only

- **WHEN** the owner enters 2019 as the year, leaves month and day empty and saves
- **THEN** the artwork is dated 2019, and the public gallery sorts it as 2019-01-01

#### Scenario: Day that does not exist

- **WHEN** the owner enters 31 February 2024
- **THEN** the editor says the date does not exist and does not save

#### Scenario: Clearing the date

- **WHEN** the owner clears the date of a piece added on 2025-11-20 and saves
- **THEN** the piece has no date and sorts as 2025-11-20 again

### Requirement: The owner credits people in order

The editor SHALL let the owner add artists and characters by typing part of a person's name and picking from the matches, reorder each list, and remove a credit. A person SHALL appear at most once in each list, and SHALL be allowed in both lists. Typing a name that matches no one SHALL offer to create a person with that name and credit them.

#### Scenario: Picking an existing artist

- **WHEN** the owner types "kit" in Artists
- **THEN** the admin offers the people whose names contain "kit", and picking one adds them as the last artist

#### Scenario: Lead artist first

- **WHEN** the owner moves the second artist to the top and saves
- **THEN** the artwork page lists that artist first

#### Scenario: Same person in both lists

- **WHEN** the owner credits a person as an artist and as a character
- **THEN** both credits are saved, and adding them a second time to either list is not offered

#### Scenario: Creating a person from the picker

- **WHEN** the owner types "Mango" in Characters and no one is named Mango
- **THEN** the admin offers to create "Mango", and choosing it creates the person with that name and adds them as a character

### Requirement: The owner tags an artwork

The editor SHALL let the owner add tags by typing them, with the suggestions that `gallery-catalog` asks for, and remove tags. Tags SHALL be shown and saved in their stored form, and a tag already on the artwork in any spelling SHALL NOT be added twice.

#### Scenario: Adding a tag in another spelling

- **WHEN** an artwork has the tag "reference sheet" and the owner types " Reference  Sheet"
- **THEN** the tag is not added a second time

### Requirement: The owner publishes and marks NSFW

The editor SHALL show whether the artwork is published and whether it is NSFW, and SHALL let the owner change both. Publishing or unpublishing SHALL take effect on the public site as `gallery-catalog` describes.

#### Scenario: Publishing a new upload

- **WHEN** the owner gives an unpublished upload a title, marks it published and saves
- **THEN** it appears in the public gallery within 10 minutes

#### Scenario: Marking a published piece NSFW

- **WHEN** the owner marks a published SFW piece NSFW and saves
- **THEN** within 10 minutes it leaves the public gallery as seen with the NSFW switch off, and stays listed with the switch on

### Requirement: Edits are saved together

The editor SHALL keep edits until the owner saves them, and SHALL save all of them at once. It SHALL show whether there are unsaved edits, confirm a successful save, and say when saving fails while keeping the edits. Leaving the editor, inside the admin or by closing the page, while edits are unsaved SHALL ask first.

#### Scenario: Saving

- **WHEN** the owner changes the title and the tags and saves
- **THEN** both changes are stored, the editor confirms the save and shows no unsaved edits

#### Scenario: Leaving with unsaved edits

- **WHEN** the owner changes the title and then opens the People page without saving
- **THEN** the admin asks before leaving, and staying keeps the edit

#### Scenario: Save fails

- **WHEN** saving fails because the connection is lost
- **THEN** the editor says the edits were not saved and keeps them for another try

### Requirement: The owner acts on several artworks at once

The Artworks page SHALL let the owner select artworks and publish, unpublish, mark NSFW, unmark NSFW or delete all selected artworks at once. Deleting SHALL ask first and say how many artworks will be deleted. Every selected artwork SHALL change, or the admin SHALL say that the action failed and none changed.

#### Scenario: Publishing a batch

- **WHEN** the owner selects five unpublished artworks and publishes them
- **THEN** all five are published, the counts change by five, and within 10 minutes all five are in the public gallery

#### Scenario: Deleting a batch

- **WHEN** the owner selects three artworks and chooses delete
- **THEN** the admin asks to confirm deleting 3 artworks, and confirming deletes all three as a single deletion would

### Requirement: Deleting an artwork from the admin

The owner SHALL be able to delete an artwork from its editor, after confirming. Deleting SHALL remove the artwork and its files as `gallery-catalog` describes, and SHALL also remove its row from the upload list. After deleting from the editor, the admin SHALL show the Artworks page.

#### Scenario: Deleting from the editor

- **WHEN** the owner deletes an artwork from its editor and confirms
- **THEN** the Artworks page is shown without it, its upload row is gone from the Uploads page, and its files no longer load

### Requirement: Artworks work on a phone

The Artworks page and the editor SHALL be usable on a phone-sized screen without scrolling sideways. On a phone the Upload button SHALL let the owner pick pictures from the phone's photo library, the editor SHALL show the image above the form, and the actions on selected artworks SHALL stay within reach at the bottom of the screen.

#### Scenario: Uploading from a phone

- **WHEN** the owner presses Upload on the Artworks page on a phone and picks two photos
- **THEN** both upload with their tiles at the top of the list

#### Scenario: Editing on a phone

- **WHEN** the owner opens an artwork's editor on a phone
- **THEN** the image is above the form, every field and Save can be reached by scrolling down, and nothing needs sideways scrolling

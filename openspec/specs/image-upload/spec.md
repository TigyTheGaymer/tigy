# image-upload Specification

## Purpose

Defines how the owner adds art: uploading files in the admin, what processing makes from each upload (the cleaned original, the web versions and a new unpublished artwork), and how the admin reports each upload's status.

## Requirements

### Requirement: The owner uploads files with progress
The Uploads page SHALL let the owner drop or pick one or more files at once. Each file SHALL appear in the upload list as soon as it is chosen and SHALL show its upload progress until the whole file has been sent. While any file is still uploading, the admin SHALL ask before the owner leaves the page.

#### Scenario: Dropping three files
- **WHEN** the owner drops three image files on the Uploads page
- **THEN** all three appear in the list at once, each with its own progress bar

#### Scenario: Leaving during an upload
- **WHEN** the owner closes the admin while a file is still uploading
- **THEN** the admin asks before leaving, and if the owner leaves, that upload stops and no artwork is created from it

### Requirement: Only supported files are accepted
The admin SHALL accept JPEG, PNG, GIF and WebP files of at most 50 MB, and SHALL refuse any other file before uploading it, saying why. Storage SHALL also refuse such a file, so the limit holds even without the admin. The format SHALL be judged by the file's content, not its name.

#### Scenario: Unsupported format
- **WHEN** the owner drops a HEIC photo
- **THEN** the admin does not upload it and says that only JPEG, PNG, GIF and WebP are supported

#### Scenario: Too large
- **WHEN** the owner picks a 60 MB PNG
- **THEN** the admin does not upload it and says the limit is 50 MB

#### Scenario: Wrong extension
- **WHEN** the owner uploads a PNG file whose name ends in `.jpg`
- **THEN** it is processed as a PNG, and its original is saved with the `.png` extension

### Requirement: Each upload becomes an unpublished artwork
Processing a supported upload SHALL create one new artwork, unpublished and not NSFW, with no title, description, date, artists or tags, crediting Tigy as its only character, sorted by the day it was uploaded. The owner SHALL be able to remove that credit like any other. No public list, count or page SHALL show the artwork until it is published.

#### Scenario: A sticker is processed
- **WHEN** the owner uploads a transparent PNG sticker on 2026-11-02 and processing finishes
- **THEN** a new unpublished artwork exists for it, sorted as 2026-11-02, and the public gallery and piece count do not include it

#### Scenario: Tigy is credited on a new upload
- **WHEN** the owner uploads a picture and processing finishes
- **THEN** its artwork credits Tigy as its only character and has no artists

#### Scenario: Removing the default credit
- **WHEN** the owner removes Tigy from a new artwork's characters and saves
- **THEN** the artwork credits no characters, and Tigy is not added back

### Requirement: The original keeps its pixels and loses its metadata
The original offered for download SHALL be the uploaded file with its metadata removed: location, camera details, editing history, comments and other embedded text SHALL be gone, while every pixel, every animation frame and its timing, the colour profile and the orientation SHALL stay exactly as uploaded. The file SHALL NOT be re-encoded.

#### Scenario: Photo with location data
- **WHEN** the owner uploads a JPEG that carries GPS coordinates and camera details
- **THEN** the downloadable original has neither, and its pixels are identical to the uploaded file's

#### Scenario: Animated GIF
- **WHEN** the owner uploads a 24-frame animated GIF
- **THEN** the original still has all 24 frames with their delays and loop count

#### Scenario: Rotated photo
- **WHEN** the owner uploads a JPEG that is stored sideways with an orientation tag
- **THEN** the original keeps the orientation, so it still displays upright

### Requirement: Web versions fit the piece
Processing SHALL make a full image whose longer side is at most 2048 pixels and a thumbnail whose longer side is at most 720 pixels, both as WebP. They SHALL keep the piece's shape, display upright, keep transparency and SHALL never be larger than the original. An animated GIF or WebP SHALL get animated web versions; any other upload SHALL get still ones.

#### Scenario: Tall comic
- **WHEN** the owner uploads a comic of 1200 by 4800 pixels
- **THEN** the full image is 512 by 2048 pixels and the thumbnail 180 by 720 pixels, showing all panels

#### Scenario: Small sticker
- **WHEN** the owner uploads a 500 by 500 pixel sticker
- **THEN** both web versions are 500 by 500 pixels and keep the transparent background

#### Scenario: Animated portrait
- **WHEN** the owner uploads an animated GIF
- **THEN** the full image and the thumbnail are animated

#### Scenario: Animated PNG
- **WHEN** the owner uploads an animated PNG
- **THEN** its web versions are still images of its first frame, and its original keeps the animation

### Requirement: File details are recorded
The new artwork SHALL record its original's format, size in bytes after metadata removal, width and height as displayed (after orientation), whether it is animated and whether it has transparent pixels. A file with an alpha channel but no transparent pixel SHALL count as not transparent.

#### Scenario: Opaque PNG with an alpha channel
- **WHEN** the owner uploads a PNG with an alpha channel whose pixels are all fully opaque
- **THEN** the artwork records it as not transparent

#### Scenario: Sideways photo
- **WHEN** the owner uploads a JPEG stored as 4000 by 3000 pixels with an orientation tag that turns it upright to 3000 by 4000
- **THEN** the artwork records it as 3000 pixels wide and 4000 high

### Requirement: The upload list shows each upload's status
The Uploads page SHALL list uploads newest first and SHALL update without reloading. Each row SHALL show the file's name and one status: uploading with its progress, processing, ready with its thumbnail and file details, or failed with the reason. A file SHALL normally be ready within two minutes after it has been sent.

#### Scenario: From upload to ready
- **WHEN** the owner uploads a 10 MB PNG
- **THEN** its row shows the upload progress, then processing, then ready with its thumbnail, dimensions and size, without the owner reloading the page

#### Scenario: Coming back later
- **WHEN** the owner reloads the Uploads page after earlier uploads finished
- **THEN** those uploads are still listed with their status

### Requirement: Failed uploads say why and leave nothing behind
When processing cannot finish, the row SHALL show failed with a reason the owner can act on, such as a damaged file, a picture too large to process or processing that took too long. A failed upload SHALL leave no artwork and no files behind. Processing SHALL refuse a picture of more than 1 billion pixels, counting every animation frame.

#### Scenario: Damaged file
- **WHEN** the owner uploads a PNG that is cut off halfway
- **THEN** its row shows failed with a message that the file is damaged, and no artwork is created

#### Scenario: Picture too large to process
- **WHEN** the owner uploads an image of 40,000 by 40,000 pixels
- **THEN** its row shows failed with a message that the picture is too large to process, and no artwork is created

#### Scenario: Processing never finishes
- **WHEN** processing of an upload stops without reporting a result
- **THEN** its row shows failed with a message that processing took too long, at the latest 10 minutes after it started, and clearing the row removes any files it left behind

### Requirement: Clearing a row keeps the artwork
The owner SHALL be able to clear a ready or failed row from the upload list. Clearing a ready row SHALL NOT delete or change its artwork.

#### Scenario: Clearing a ready upload
- **WHEN** the owner clears a ready row
- **THEN** the row leaves the list, and the artwork it created still exists with its files

### Requirement: Public files come only from processing
Browsers SHALL NOT be able to write, replace or delete any artwork file; only processing SHALL create them. No one SHALL be able to read an uploaded file before processing, and processing SHALL delete it once it is done, whether it succeeded or failed. An uploaded file that is never processed SHALL be deleted after a day. Only processing SHALL write upload records; the owner SHALL be able to read them and clear them.

#### Scenario: Writing an artwork file from a browser
- **WHEN** the signed-in owner's browser tries to write a file under an artwork's folder in Storage
- **THEN** Storage refuses the write

#### Scenario: Reading an upload
- **WHEN** anyone, the owner included, tries to read an uploaded file in Storage
- **THEN** Storage refuses the read

#### Scenario: A stranger tries to upload
- **WHEN** a browser that is not signed in as the owner tries to upload a file
- **THEN** Storage refuses it

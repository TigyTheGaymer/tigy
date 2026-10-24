## MODIFIED Requirements

### Requirement: Only supported files are accepted
The admin SHALL accept JPEG, PNG, GIF and WebP images of at most 50 MB and MP4, MOV and WebM videos of at most 200 MB, and SHALL refuse any other file before uploading it, saying why. Storage SHALL also refuse such a file, so the limits hold even without the admin. The format SHALL be judged by the file's content, not its name.

#### Scenario: Unsupported format
- **WHEN** the owner drops a HEIC photo
- **THEN** the admin does not upload it and says that only JPEG, PNG, GIF, WebP, MP4, MOV and WebM are supported

#### Scenario: Too large
- **WHEN** the owner picks a 60 MB PNG
- **THEN** the admin does not upload it and says the limit for images is 50 MB

#### Scenario: Large video
- **WHEN** the owner picks a 120 MB MP4
- **THEN** the admin uploads it

#### Scenario: Video too large
- **WHEN** the owner picks a 250 MB MOV
- **THEN** the admin does not upload it and says the limit for videos is 200 MB

#### Scenario: Image sent as a video
- **WHEN** a browser signed in as the owner sends a 120 MB PNG to Storage, declared as a video
- **THEN** processing refuses it, its row says the limit for images is 50 MB, and no artwork is created

#### Scenario: Wrong extension
- **WHEN** the owner uploads a PNG file whose name ends in `.jpg`
- **THEN** it is processed as a PNG, and its original is saved with the `.png` extension

#### Scenario: Video with the wrong extension
- **WHEN** the owner uploads a WebM file whose name ends in `.mp4`
- **THEN** it is processed as a WebM, and its original is saved with the `.webm` extension

### Requirement: The original keeps its pixels and loses its metadata
The original offered for download SHALL be the uploaded file with its metadata removed: location, camera or device details, creation dates, editing history, comments and other embedded text SHALL be gone, and so SHALL a video's metadata, subtitle and data tracks. Every pixel, every animation frame and its timing, a video's picture and sound, the colour profile and the orientation SHALL stay exactly as uploaded. The file SHALL NOT be re-encoded.

#### Scenario: Photo with location data
- **WHEN** the owner uploads a JPEG that carries GPS coordinates and camera details
- **THEN** the downloadable original has neither, and its pixels are identical to the uploaded file's

#### Scenario: Animated GIF
- **WHEN** the owner uploads a 24-frame animated GIF
- **THEN** the original still has all 24 frames with their delays and loop count

#### Scenario: Rotated photo
- **WHEN** the owner uploads a JPEG that is stored sideways with an orientation tag
- **THEN** the original keeps the orientation, so it still displays upright

#### Scenario: Phone video with location data
- **WHEN** the owner uploads a MOV recorded on a phone that carries its location, the phone's model and a timed metadata track
- **THEN** the downloadable original has none of them, and its video and audio streams are identical to the uploaded file's

#### Scenario: Rotated video
- **WHEN** the owner uploads a video stored landscape with a rotation that shows it upright as portrait
- **THEN** the original keeps the rotation, so it still plays upright

### Requirement: Web versions fit the piece
Processing SHALL make a full image whose longer side is at most 2048 pixels and a thumbnail whose longer side is at most 720 pixels, both as WebP. They SHALL keep the piece's shape, display upright, keep transparency and SHALL never be larger than the original. An animated GIF or WebP SHALL get animated web versions; a video SHALL get still ones of a frame from its first second; any other upload SHALL get still ones.

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

#### Scenario: Video stills
- **WHEN** the owner uploads a 1920 by 1080 pixel video that opens on a black frame
- **THEN** its full image is 1920 by 1080 pixels and its thumbnail 720 by 405 pixels, both still and showing a frame from its first second

### Requirement: File details are recorded
The new artwork SHALL record its original's format, size in bytes after metadata removal, width and height as displayed (after orientation), whether it is animated and whether it has transparent pixels. A file with an alpha channel but no transparent pixel SHALL count as not transparent. A video SHALL also record its duration and whether it has sound, and SHALL count as animated and not transparent.

#### Scenario: Opaque PNG with an alpha channel
- **WHEN** the owner uploads a PNG with an alpha channel whose pixels are all fully opaque
- **THEN** the artwork records it as not transparent

#### Scenario: Sideways photo
- **WHEN** the owner uploads a JPEG stored as 4000 by 3000 pixels with an orientation tag that turns it upright to 3000 by 4000
- **THEN** the artwork records it as 3000 pixels wide and 4000 high

#### Scenario: Video with sound
- **WHEN** the owner uploads a 42-second MP4 of 1080 by 1920 pixels with an audio track
- **THEN** the artwork records it as an MP4, 1080 pixels wide and 1920 high, 42 seconds long, animated, with sound and not transparent

#### Scenario: Silent video
- **WHEN** the owner uploads a WebM without an audio track
- **THEN** the artwork records it as having no sound

### Requirement: The upload list shows each upload's status
The Uploads page SHALL list uploads newest first and SHALL update without reloading. Each row SHALL show the file's name and one status: uploading with its progress, processing, ready with its thumbnail and file details, or failed with the reason. A ready video's file details SHALL include its duration. An image SHALL normally be ready within two minutes after it has been sent, and a video within five.

#### Scenario: From upload to ready
- **WHEN** the owner uploads a 10 MB PNG
- **THEN** its row shows the upload progress, then processing, then ready with its thumbnail, dimensions and size, without the owner reloading the page

#### Scenario: A video becomes ready
- **WHEN** the owner uploads a one-minute 1080p MP4 and processing finishes
- **THEN** its row shows ready with its still thumbnail, dimensions, size and duration, within five minutes of the upload ending

#### Scenario: Coming back later
- **WHEN** the owner reloads the Uploads page after earlier uploads finished
- **THEN** those uploads are still listed with their status

### Requirement: Failed uploads say why and leave nothing behind
When processing cannot finish, the row SHALL show failed with a reason the owner can act on, such as a damaged file, a picture too large to process, a video too long or too large, or processing that took too long. A failed upload SHALL leave no artwork and no files behind. Processing SHALL refuse a picture of more than 1 billion pixels, counting every animation frame, a video longer than 3 minutes and a video larger than 3840 by 2160 pixels in either orientation.

#### Scenario: Damaged file
- **WHEN** the owner uploads a PNG that is cut off halfway
- **THEN** its row shows failed with a message that the file is damaged, and no artwork is created

#### Scenario: Picture too large to process
- **WHEN** the owner uploads an image of 40,000 by 40,000 pixels
- **THEN** its row shows failed with a message that the picture is too large to process, and no artwork is created

#### Scenario: Video too long
- **WHEN** the owner uploads a 5-minute MP4
- **THEN** its row shows failed with a message that videos may be at most 3 minutes long, and no artwork is created

#### Scenario: Video too large
- **WHEN** the owner uploads an 8K video of 7680 by 4320 pixels
- **THEN** its row shows failed with a message that videos may be at most 3840 by 2160 pixels, and no artwork is created

#### Scenario: Video in a codec that cannot be read
- **WHEN** the owner uploads a MOV whose video is in a codec processing cannot decode
- **THEN** its row shows failed with a message that the file could not be read, and no artwork is created

#### Scenario: Processing never finishes
- **WHEN** processing of an upload stops without reporting a result
- **THEN** its row shows failed with a message that processing took too long, at the latest 10 minutes after it started, and clearing the row removes any files it left behind

## ADDED Requirements

### Requirement: A video gets a playable web copy and a preview loop
Processing a video SHALL make a web copy that plays in current browsers, upright, with its sound, its longer side at most 1920 pixels and never larger than the original. It SHALL also make a silent preview loop of at most the first 10 seconds with its longer side at most 720 pixels. Both SHALL keep the video's shape.

#### Scenario: Portrait animation with sound
- **WHEN** the owner uploads a 42-second MOV of 2160 by 3840 pixels with sound
- **THEN** its web copy is 1080 by 1920 pixels, 42 seconds long with sound, and its preview is 405 by 720 pixels, 10 seconds long and silent

#### Scenario: Short loop
- **WHEN** the owner uploads a 4-second WebM of 800 by 800 pixels
- **THEN** its web copy is 800 by 800 pixels and 4 seconds long, and its preview is 720 by 720 pixels and 4 seconds long

#### Scenario: Plays in Safari
- **WHEN** the owner uploads a WebM in VP9 and a visitor opens it in Safari on an iPhone
- **THEN** the web copy and the preview play

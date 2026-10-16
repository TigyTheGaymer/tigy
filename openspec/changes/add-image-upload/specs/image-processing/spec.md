# Spec Delta

## Purpose

Defines how an uploaded image file becomes the downloadable master, the web versions and the link-preview image, and how processing status, limits and file cleanup behave.

## ADDED Requirements

### Requirement: Accepted uploads
The system SHALL accept JPEG, PNG, GIF, WebP and APNG uploads of at most 20 MB. Other file types and larger files SHALL be rejected.

#### Scenario: Oversized upload
- **WHEN** the owner uploads a 25 MB PNG
- **THEN** the upload is rejected and nothing is processed

#### Scenario: Unsupported type
- **WHEN** the owner uploads a PDF
- **THEN** the upload is rejected

### Requirement: Lossless master in the original format
Each upload SHALL produce a master file in the same format as the upload. The master's pixels SHALL be identical to the upload's, and its color profile SHALL be kept. All other embedded metadata, including camera, location and software data, SHALL be removed.

#### Scenario: JPEG with location data
- **WHEN** the owner uploads a JPEG that contains GPS coordinates and camera data
- **THEN** the master is a JPEG with identical pixels, the same color profile, and no GPS or camera data

#### Scenario: PNG upload
- **WHEN** the owner uploads a PNG
- **THEN** the master is a PNG with identical pixels

### Requirement: Readable download filename
Downloading the master SHALL save it under a readable filename built from the image's details (such as the artist, title and date), with the master's file extension.

#### Scenario: Download name
- **WHEN** a visitor downloads the master of an image titled "Sunset" by artist "Kiko"
- **THEN** the saved file name contains "kiko" and "sunset" and ends with the master's extension

### Requirement: Web versions
Each upload SHALL produce a full-view version at most 1200 pixels wide and a thumbnail at most 400 pixels wide, both in WebP format, with the original aspect ratio kept. An image smaller than a target width SHALL keep its own size and SHALL NOT be enlarged.

#### Scenario: Large image
- **WHEN** the owner uploads a 3000x4000 image
- **THEN** a 1200x1600 full-view version and a 400x533 thumbnail are produced

#### Scenario: Small image
- **WHEN** the owner uploads a 600x600 image
- **THEN** the full-view version is 600x600 and the thumbnail is 400x400

### Requirement: Animated images stay animated
When the upload is animated (GIF, APNG or animated WebP), the full-view version and the thumbnail SHALL keep the animation, including frame timing and looping, and the image SHALL be marked as animated.

#### Scenario: Animated GIF
- **WHEN** the owner uploads an animated GIF with 30 frames
- **THEN** the full-view version and the thumbnail are animated with the same frame timing, and the master is the original GIF

### Requirement: Link-preview image
Each upload SHALL produce a still JPEG preview image for link previews. For animated uploads, the preview SHALL show the first frame.

#### Scenario: Animated upload preview
- **WHEN** the owner uploads an animated GIF
- **THEN** the preview image is a still JPEG of its first frame

### Requirement: Processing status is visible
Each image SHALL have a processing status of processing, ready or error. An image in error SHALL include a short, human-readable reason.

#### Scenario: Successful processing
- **WHEN** processing of an upload completes
- **THEN** the image's status becomes ready and all of its files are available

#### Scenario: Corrupt file
- **WHEN** the owner uploads a file that cannot be decoded
- **THEN** the image's status becomes error with a reason, and processing is not retried automatically

#### Scenario: Oversized dimensions
- **WHEN** the owner uploads a file under 20 MB whose pixel dimensions times frame count exceed the processing limit
- **THEN** the image's status becomes error with a reason saying the image is too large

### Requirement: The raw upload is removed after success
After an upload has been processed successfully, the raw upload SHALL be deleted, so only the master, web versions and preview remain. After a failed processing, the raw upload SHALL be kept.

#### Scenario: Cleanup after success
- **WHEN** an image's status becomes ready
- **THEN** its raw upload no longer exists in storage

#### Scenario: Kept after failure
- **WHEN** an image's status becomes error
- **THEN** its raw upload is still in storage

### Requirement: Replacing an image file
The owner SHALL be able to replace the file of an existing image. The new file SHALL be processed like a new upload, and the image's file addresses SHALL change, so that no visitor keeps seeing the old file from a cache.

#### Scenario: Replacement
- **WHEN** the owner replaces an image's file
- **THEN** the image keeps its ID, its files are regenerated from the new upload, and the addresses of its files differ from before

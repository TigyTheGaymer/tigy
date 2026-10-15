# Spec Delta

## Purpose

Defines who may read and write the gallery's data and files. These rules are enforced by the backend, so they hold no matter which client makes the request.

## ADDED Requirements

### Requirement: Only the owner writes
Only requests signed in as the owner's account SHALL be able to create, change or delete images, artists or files. Being signed in with any other account SHALL NOT grant write access.

#### Scenario: Anonymous write
- **WHEN** a request that is not signed in tries to change an image
- **THEN** the request is denied

#### Scenario: Other signed-in account
- **WHEN** a request signed in with a different Google account tries to create an artist
- **THEN** the request is denied

### Requirement: Drafts are readable only by the owner
Anyone SHALL be able to read published images. Draft images SHALL be readable only by the owner. This SHALL hold for direct requests to the backend, not only for the public site.

#### Scenario: Direct request for a draft
- **WHEN** a request that is not signed in asks the backend directly for a draft image entry
- **THEN** the request is denied

#### Scenario: Query that could include drafts
- **WHEN** a request that is not signed in asks for image entries without restricting the results to published images
- **THEN** the request is denied

### Requirement: Public queries are size-limited
A request that is not signed in SHALL be able to read at most 24 image entries per query.

#### Scenario: Oversized query
- **WHEN** a request that is not signed in asks for 100 published images in one query
- **THEN** the request is denied

#### Scenario: Normal page
- **WHEN** a request that is not signed in asks for 24 published images
- **THEN** the request succeeds

### Requirement: Artists are publicly readable
Anyone SHALL be able to read artist records. Only the owner SHALL be able to write them.

#### Scenario: Reading an artist
- **WHEN** a request that is not signed in reads an artist record
- **THEN** the request succeeds

### Requirement: No direct public access to stored files
Stored files SHALL NOT be readable through direct, unauthenticated storage requests. Public access to a file SHALL only be possible through a published image's entry: the file address recorded on it, or the public site's image address for it.

#### Scenario: Guessing a file path
- **WHEN** someone who knows an image's ID requests its files from storage directly, without a file address from the image's entry
- **THEN** the request is denied

#### Scenario: Draft image files
- **WHEN** an image is a draft
- **THEN** no one but the owner can obtain the addresses of its files

#### Scenario: Draft image through the public site
- **WHEN** someone requests the public site's image address for a draft image
- **THEN** the response is not found

### Requirement: Owner uploads are restricted
The owner SHALL be able to upload only to the upload area, and only image files of at most 20 MB. No client, including the owner's, SHALL be able to write processed files directly.

#### Scenario: Upload outside the upload area
- **WHEN** the owner's client tries to write a file directly where processed files are kept
- **THEN** the request is denied

#### Scenario: Non-image upload
- **WHEN** the owner's client uploads a text file to the upload area
- **THEN** the request is denied

### Requirement: Processing results are backend-only
An image's processing status, error reason, file addresses, dimensions and animated flag SHALL be written only by the backend's processing. No client, including the owner's, SHALL be able to set them.

#### Scenario: Owner sets status
- **WHEN** the owner's client tries to set an image's status to ready
- **THEN** the request is denied

### Requirement: Publishing requires a ready image
The backend SHALL refuse to mark an image as published unless its processing status is ready, regardless of which client sends the request.

#### Scenario: Publishing a processing image directly
- **WHEN** the owner's client asks the backend to publish an image with status processing
- **THEN** the request is denied

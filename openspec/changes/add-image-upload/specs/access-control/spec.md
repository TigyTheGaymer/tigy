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

### Requirement: No direct public access to stored files
Stored files SHALL NOT be readable through direct, unauthenticated storage requests. Public access to a file SHALL only be possible through a published image's entry.

#### Scenario: Guessing a file path
- **WHEN** someone who knows an image's ID requests its files from storage directly, without a file address from the image's entry
- **THEN** the request is denied

#### Scenario: Draft image files
- **WHEN** an image is a draft
- **THEN** no one but the owner can obtain the addresses of its files

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

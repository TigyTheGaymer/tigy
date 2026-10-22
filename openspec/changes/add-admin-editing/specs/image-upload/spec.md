# Spec Delta

## MODIFIED Requirements

### Requirement: The owner uploads files with progress
The Uploads page SHALL let the owner drop or pick one or more files at once. Each file SHALL appear in the upload list as soon as it is chosen and SHALL show its upload progress until the whole file has been sent. While any file is still uploading, the admin SHALL ask before the owner leaves the page. Files uploaded from the Artworks page SHALL appear in the upload list in the same way.

#### Scenario: Dropping three files
- **WHEN** the owner drops three image files on the Uploads page
- **THEN** all three appear in the list at once, each with its own progress bar

#### Scenario: Leaving during an upload
- **WHEN** the owner closes the admin while a file is still uploading
- **THEN** the admin asks before leaving, and if the owner leaves, that upload stops and no artwork is created from it

#### Scenario: Uploading from the Artworks page
- **WHEN** the owner uploads a file from the Artworks page and then opens the Uploads page
- **THEN** the file is listed with its current progress or status

## ADDED Requirements

### Requirement: A ready upload opens its artwork

A ready row in the upload list SHALL open the artwork it created in the artwork editor. A row whose artwork has since been deleted SHALL leave the list.

#### Scenario: Editing a fresh upload

- **WHEN** the owner chooses a ready row on the Uploads page
- **THEN** the artwork editor opens for the artwork that upload created

#### Scenario: Artwork deleted

- **WHEN** the owner deletes an artwork whose upload row is still listed
- **THEN** that row leaves the upload list

### Requirement: Artworks come only from processing

Browsers SHALL NOT be able to create an artwork; only processing an upload SHALL create one. The signed-in owner's browser SHALL be able to change only an artwork's title, description, date, sort date, published and NSFW state, credits and tags, each with its stored type, and SHALL NOT be able to change its file details or when it was created.

#### Scenario: Creating an artwork from a browser

- **WHEN** the signed-in owner's browser tries to create a document in the artworks collection
- **THEN** the database refuses the write

#### Scenario: Changing a file's details from a browser

- **WHEN** the signed-in owner's browser tries to change an artwork's recorded width
- **THEN** the database refuses the write

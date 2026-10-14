# Spec Delta

## Purpose

Defines the owner's private admin site: signing in, uploading and editing images, managing artists, publishing, and seeing processing status.

## ADDED Requirements

### Requirement: Only the owner can sign in
The admin site SHALL require Google sign-in and SHALL grant access only to the owner's Google account. Any other account SHALL be refused.

#### Scenario: Owner signs in
- **WHEN** the owner signs in with their Google account
- **THEN** the admin site opens

#### Scenario: Other account
- **WHEN** someone signs in with any other Google account
- **THEN** access is refused and no images or drafts are shown

### Requirement: Admin site is not indexed
The admin site SHALL tell search engines not to index any of its pages.

#### Scenario: Search engine visits the admin
- **WHEN** a search engine requests an admin page
- **THEN** the response tells it not to index the page

### Requirement: Adding an image
The owner SHALL be able to add an image by uploading a file and optionally filling in its fields. The new entry SHALL appear in the admin right away as a draft.

#### Scenario: Upload
- **WHEN** the owner uploads a file and saves
- **THEN** a draft entry appears in the admin with status processing

### Requirement: Processing status in the admin
The admin SHALL show each image's processing status and update it without a page reload. An image in error SHALL show its reason, and the owner SHALL be able to retry by replacing the file.

#### Scenario: Processing finishes
- **WHEN** an image's processing completes while the owner is viewing it
- **THEN** its status changes to ready without a reload, and publishing becomes possible

#### Scenario: Processing fails
- **WHEN** an image's processing fails
- **THEN** the admin shows the error reason and offers to replace the file

### Requirement: Editing image details
The owner SHALL be able to edit every field of an image. The artist SHALL be chosen from the list of existing artists, and the set SHALL be chosen from the existing set names or entered as a new one.

#### Scenario: Assigning an artist
- **WHEN** the owner assigns an artist to an image
- **THEN** the artist is picked from the list of artists and the image shows that artist's name and links

### Requirement: Publishing and unpublishing
The owner SHALL be able to publish a ready image and unpublish a published one. The admin SHALL list drafts and published images, including NSFW images, and show each one's state.

#### Scenario: Publish
- **WHEN** the owner publishes a ready image
- **THEN** the admin shows it as published

#### Scenario: Image not ready
- **WHEN** an image's status is processing or error
- **THEN** the admin does not let the owner publish it

### Requirement: Deleting an image
The owner SHALL be able to delete an image entry after confirming. The entry and all of its files SHALL be removed.

#### Scenario: Delete
- **WHEN** the owner deletes an image and confirms
- **THEN** the entry disappears from the admin and from the public site

### Requirement: Managing artists
The owner SHALL be able to create, edit and delete artists, including adding, editing, reordering and removing their links.

#### Scenario: New artist
- **WHEN** the owner creates an artist with a name and links
- **THEN** the artist becomes available when assigning artists to images

### Requirement: Images of deleted artists are flagged
The admin SHALL mark images whose artist has been deleted, so the owner can reassign them.

#### Scenario: Artist deleted
- **WHEN** the owner deletes an artist who is credited on images
- **THEN** those images are marked in the admin as having a deleted artist

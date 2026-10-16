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
The owner SHALL be able to add an image by uploading a file and optionally filling in its fields. The new entry SHALL appear in the admin right away.

#### Scenario: Upload
- **WHEN** the owner uploads a file and saves
- **THEN** a new entry appears in the admin with status processing

### Requirement: Processing status in the admin
The admin SHALL show each image's processing status and update it without a page reload. An image in error SHALL show its reason, and the owner SHALL be able to retry by replacing the file.

#### Scenario: Processing finishes
- **WHEN** an image's processing completes while the owner is viewing it
- **THEN** its status changes to ready without a reload

#### Scenario: Processing fails
- **WHEN** an image's processing fails
- **THEN** the admin shows the error reason and offers to replace the file

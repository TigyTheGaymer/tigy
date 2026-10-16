# Spec Delta

## ADDED Requirements

### Requirement: Editing image details
The owner SHALL be able to edit an image's title, date, set, NSFW flag and description. The set SHALL be chosen from the existing set names or entered as a new one.

#### Scenario: Editing a title
- **WHEN** the owner changes an image's title and saves
- **THEN** the admin shows the new title and the image keeps its ID

#### Scenario: Picking a set
- **WHEN** the owner starts typing a set name that already exists
- **THEN** the admin offers the existing set name to pick

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

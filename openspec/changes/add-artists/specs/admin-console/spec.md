# Spec Delta

## MODIFIED Requirements

### Requirement: Editing image details
The owner SHALL be able to edit every field of an image. The artist SHALL be chosen from the list of existing artists, and the set SHALL be chosen from the existing set names or entered as a new one.

#### Scenario: Editing a title
- **WHEN** the owner changes an image's title and saves
- **THEN** the admin shows the new title and the image keeps its ID

#### Scenario: Picking a set
- **WHEN** the owner starts typing a set name that already exists
- **THEN** the admin offers the existing set name to pick

#### Scenario: Assigning an artist
- **WHEN** the owner assigns an artist to an image
- **THEN** the artist is picked from the list of artists and the image shows that artist's name and links

## ADDED Requirements

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

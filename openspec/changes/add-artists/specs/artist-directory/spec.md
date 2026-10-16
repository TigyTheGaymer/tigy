# Spec Delta

## Purpose

Defines artist records and how an artist's credit and links appear on their images, including what happens when an artist is edited or deleted.

## ADDED Requirements

### Requirement: Artist records hold public links only
Each artist SHALL have a permanent ID, a name, and a list of links, each with a label and a URL. Artist records SHALL NOT hold private contact data. Artist records SHALL be publicly readable.

#### Scenario: Artist with several links
- **WHEN** the owner saves an artist with a name and three labelled links
- **THEN** the artist record holds the name and all three links in the order given

#### Scenario: No private fields
- **WHEN** the owner edits an artist
- **THEN** there is no field for private contact data such as a private email address or phone number

### Requirement: Images show their artist's credit
An image with an artist SHALL show that artist's name and links wherever the image's details are shown, without a separate lookup per artist.

#### Scenario: Credited image
- **WHEN** a visitor views a published image that has an artist
- **THEN** the artist's name and links are shown with the image

#### Scenario: Uncredited image
- **WHEN** a visitor views a published image without an artist
- **THEN** no artist credit is shown

### Requirement: Artist edits reach all their images
When the owner edits an artist's name or links, every image credited to that artist, published or draft, SHALL show the updated details within seconds.

#### Scenario: Renaming an artist
- **WHEN** the owner renames an artist who is credited on 12 images
- **THEN** all 12 images show the new name shortly afterwards, subject to public page caching

#### Scenario: Adding a link
- **WHEN** the owner adds a link to an artist
- **THEN** the new link appears on every image credited to that artist

### Requirement: Deleting an artist keeps their credit on images
Deleting an artist SHALL NOT change their images. Those images SHALL keep showing the artist's last name and links. The deleted artist's page SHALL no longer exist.

#### Scenario: Artist deleted
- **WHEN** the owner deletes an artist who is credited on images
- **THEN** those images still show the artist's last saved name and links

#### Scenario: Deleted artist's page
- **WHEN** a visitor opens the page of a deleted artist
- **THEN** a "not found" page is shown

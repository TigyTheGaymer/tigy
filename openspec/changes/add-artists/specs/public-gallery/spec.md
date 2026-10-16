# Spec Delta

## MODIFIED Requirements

### Requirement: Image page
Each published image SHALL have a page at `/i/{id}` that shows the full-view version and the image's title, artist credit with links, date, set and description, wherever those are set.

#### Scenario: Opening an image
- **WHEN** a visitor opens `/i/{id}` for a published SFW image
- **THEN** the full-view version is shown with the image's details

#### Scenario: Draft or unknown image
- **WHEN** a visitor opens `/i/{id}` for a draft or for an ID that does not exist
- **THEN** a "not found" page is shown and no image file address is revealed

## ADDED Requirements

### Requirement: Artist page
Each artist SHALL have a page at `/artists/{id}` that shows the artist's name, their links, and their published images, following the catalog's ordering and paging and the visitor's NSFW switch.

#### Scenario: Artist with published images
- **WHEN** a visitor opens the page of an artist credited on published images
- **THEN** the artist's name, links and published images are shown

#### Scenario: Artist with only drafts
- **WHEN** a visitor opens the page of an artist whose images are all drafts
- **THEN** the artist's name and links are shown with no images

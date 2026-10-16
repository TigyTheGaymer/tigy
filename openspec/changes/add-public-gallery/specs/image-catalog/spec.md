# Spec Delta

## ADDED Requirements

### Requirement: Images start as drafts
Every new image entry SHALL be a draft. A draft SHALL be visible only to the owner until the owner publishes it. The owner SHALL be able to unpublish a published image, which makes it a draft again.

#### Scenario: New entry is a draft
- **WHEN** the owner creates an image entry
- **THEN** it is not visible on the public site

#### Scenario: Unpublishing
- **WHEN** the owner unpublishes a published image
- **THEN** it disappears from the public site and remains visible to the owner

### Requirement: Only processed images can be published
An image SHALL be publishable only after its processing has completed successfully.

#### Scenario: Publishing while processing
- **WHEN** the owner tries to publish an image whose processing has not finished
- **THEN** the image stays a draft

#### Scenario: Publishing a failed image
- **WHEN** the owner tries to publish an image whose processing failed
- **THEN** the image stays a draft

### Requirement: Sets link versions of one piece
An image MAY belong to one named set. All images that share a set name SHALL be treated as versions of the same piece. When assigning a set, the owner SHALL be able to pick an existing set name or enter a new one.

#### Scenario: Linking a clean and an NSFW version
- **WHEN** the owner gives a clean image and an NSFW image the same set name
- **THEN** both images belong to the same set

#### Scenario: Reusing a set name
- **WHEN** the owner assigns a set to an image and a set with that name already exists
- **THEN** the owner can choose the existing set name instead of typing it again

### Requirement: Published images are ordered newest first
Published images SHALL be listed newest first by their date. Images without a date SHALL be ordered by the date they were added. Images with the same date SHALL keep a stable order.

#### Scenario: Undated image
- **WHEN** an image without a date is published
- **THEN** it appears in the list according to the date it was added

#### Scenario: Same date
- **WHEN** several published images share the same date
- **THEN** they appear in the same relative order every time the list is loaded

### Requirement: Published images are paged
Lists of published images SHALL be delivered in pages of at most 24 images. Loading the next page SHALL continue exactly where the previous page ended.

#### Scenario: Next page
- **WHEN** a visitor has seen the first page and loads the next page
- **THEN** the next page starts with the image right after the last one shown, with no image skipped or repeated

#### Scenario: Small gallery
- **WHEN** fewer than 24 images are published
- **THEN** all of them are shown on the first page and there is no next page

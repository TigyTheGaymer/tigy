# Spec Delta

## ADDED Requirements

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

### Requirement: Publishing requires a ready image
The backend SHALL refuse to mark an image as published unless its processing status is ready, regardless of which client sends the request.

#### Scenario: Publishing a processing image directly
- **WHEN** the owner's client asks the backend to publish an image with status processing
- **THEN** the request is denied

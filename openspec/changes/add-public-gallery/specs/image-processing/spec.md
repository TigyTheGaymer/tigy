# Spec Delta

## ADDED Requirements

### Requirement: Files are removed with their image
Deleting an image entry SHALL delete all of its files: master, web versions, preview, and any remaining raw upload.

#### Scenario: Deleting an image
- **WHEN** the owner deletes an image entry
- **THEN** none of its files remain in storage

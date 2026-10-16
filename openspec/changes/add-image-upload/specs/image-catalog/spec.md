# Spec Delta

## Purpose

Defines the gallery's image entries: their identity, fields, sets, draft and published state, and how published images are ordered and paged.

## ADDED Requirements

### Requirement: Each image has a permanent ID
The system SHALL assign every image entry a unique ID when the entry is created. The ID SHALL never change afterwards, and the image's public address SHALL be `/i/{id}`.

#### Scenario: ID survives edits
- **WHEN** the owner changes an image's title, artist, date or set
- **THEN** the image keeps the same ID and the same `/i/{id}` address

#### Scenario: IDs are unique
- **WHEN** two image entries are created
- **THEN** they receive different IDs

### Requirement: Image fields
An image entry SHALL consist of an image file plus these fields: title, artist, date, set, NSFW flag, and description. The image file SHALL be the only required part. Every other field SHALL be optional, and the NSFW flag SHALL default to off.

#### Scenario: Entry with only a file
- **WHEN** the owner creates an entry with an image file and no other fields
- **THEN** the entry is saved, not marked NSFW, and has no title, artist, date, set or description

#### Scenario: Entry without a file
- **WHEN** the owner tries to create an entry without an image file
- **THEN** the entry is not created

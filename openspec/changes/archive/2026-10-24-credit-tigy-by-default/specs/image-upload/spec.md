## MODIFIED Requirements

### Requirement: Each upload becomes an unpublished artwork
Processing a supported upload SHALL create one new artwork, unpublished and not NSFW, with no title, description, date, artists or tags, crediting Tigy as its only character, sorted by the day it was uploaded. The owner SHALL be able to remove that credit like any other. No public list, count or page SHALL show the artwork until it is published.

#### Scenario: A sticker is processed
- **WHEN** the owner uploads a transparent PNG sticker on 2026-11-02 and processing finishes
- **THEN** a new unpublished artwork exists for it, sorted as 2026-11-02, and the public gallery and piece count do not include it

#### Scenario: Tigy is credited on a new upload
- **WHEN** the owner uploads a picture and processing finishes
- **THEN** its artwork credits Tigy as its only character and has no artists

#### Scenario: Removing the default credit
- **WHEN** the owner removes Tigy from a new artwork's characters and saves
- **THEN** the artwork credits no characters, and Tigy is not added back

# Spec Delta

## MODIFIED Requirements

### Requirement: NSFW images are hidden by default
NSFW images SHALL be left out of every public list unless the visitor turns on the "show NSFW" switch. The switch SHALL be off for new visitors, and the visitor's choice SHALL be remembered in their browser.

#### Scenario: First visit
- **WHEN** a visitor opens the gallery for the first time
- **THEN** no NSFW images are listed

#### Scenario: Switch turned on
- **WHEN** a visitor turns on the "show NSFW" switch
- **THEN** NSFW images appear in the gallery, and they still appear on the visitor's next visit in the same browser

### Requirement: Other versions in the same set
An image page SHALL show the other published images in the same set, following the visitor's NSFW switch.

#### Scenario: Clean version page
- **WHEN** a visitor with the switch off views a clean image whose set also has an NSFW version
- **THEN** the NSFW version is not shown among the other versions

#### Scenario: Switch on
- **WHEN** a visitor with the switch on views an image whose set has two other published versions
- **THEN** both other versions are shown

## ADDED Requirements

### Requirement: NSFW confirm screen on direct links
Opening the page of an NSFW image SHALL first show a confirm screen without the image, unless the visitor's "show NSFW" switch is on. The image SHALL be shown only after the visitor confirms.

#### Scenario: Direct link with switch off
- **WHEN** a visitor with the switch off opens the page of an NSFW image
- **THEN** a confirm screen is shown without the image, and the image appears only after the visitor confirms

#### Scenario: Direct link with switch on
- **WHEN** a visitor with the switch on opens the page of an NSFW image
- **THEN** the image is shown directly

### Requirement: NSFW images stay out of search
NSFW image pages SHALL be marked so that search engines do not index them, and NSFW images SHALL never appear in any page's search or preview metadata.

#### Scenario: Search engine visits an NSFW page
- **WHEN** a search engine requests the page of an NSFW image
- **THEN** the page tells search engines not to index it

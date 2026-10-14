# Spec Delta

## Purpose

Defines what visitors can see and do on the public site: the gallery, image and artist pages, the NSFW switch, downloads, link previews, search visibility and how fresh pages are.

## ADDED Requirements

### Requirement: Gallery of published images
The gallery page SHALL list published images as thumbnails in the catalog's order and paging. It SHALL never include drafts.

#### Scenario: Visitor opens the gallery
- **WHEN** a visitor opens the gallery
- **THEN** the first page of published images is shown, newest first

#### Scenario: Drafts excluded
- **WHEN** the owner has draft images
- **THEN** none of them appear in the gallery

### Requirement: NSFW images are hidden by default
NSFW images SHALL be left out of every public list unless the visitor turns on the "show NSFW" switch. The switch SHALL be off for new visitors, and the visitor's choice SHALL be remembered in their browser.

#### Scenario: First visit
- **WHEN** a visitor opens the gallery for the first time
- **THEN** no NSFW images are listed

#### Scenario: Switch turned on
- **WHEN** a visitor turns on the "show NSFW" switch
- **THEN** NSFW images appear in the gallery, and they still appear on the visitor's next visit in the same browser

### Requirement: Image page
Each published image SHALL have a page at `/i/{id}` that shows the full-view version and the image's title, artist credit with links, date, set and description, wherever those are set.

#### Scenario: Opening an image
- **WHEN** a visitor opens `/i/{id}` for a published SFW image
- **THEN** the full-view version is shown with the image's details

#### Scenario: Draft or unknown image
- **WHEN** a visitor opens `/i/{id}` for a draft or for an ID that does not exist
- **THEN** a "not found" page is shown and no image file address is revealed

### Requirement: NSFW confirm screen on direct links
Opening the page of an NSFW image SHALL first show a confirm screen without the image, unless the visitor's "show NSFW" switch is on. The image SHALL be shown only after the visitor confirms.

#### Scenario: Direct link with switch off
- **WHEN** a visitor with the switch off opens the page of an NSFW image
- **THEN** a confirm screen is shown without the image, and the image appears only after the visitor confirms

#### Scenario: Direct link with switch on
- **WHEN** a visitor with the switch on opens the page of an NSFW image
- **THEN** the image is shown directly

### Requirement: Other versions in the same set
An image page SHALL show the other published images in the same set, following the visitor's NSFW switch.

#### Scenario: Clean version page
- **WHEN** a visitor with the switch off views a clean image whose set also has an NSFW version
- **THEN** the NSFW version is not shown among the other versions

#### Scenario: Switch on
- **WHEN** a visitor with the switch on views an image whose set has two other published versions
- **THEN** both other versions are shown

### Requirement: Downloading the original
Every published image's page SHALL offer a download of its master file.

#### Scenario: Download
- **WHEN** a visitor uses the download option on an image page
- **THEN** the master file is downloaded under its readable filename

### Requirement: Artist page
Each artist SHALL have a page at `/artists/{id}` that shows the artist's name, their links, and their published images, following the catalog's ordering and paging and the visitor's NSFW switch.

#### Scenario: Artist with published images
- **WHEN** a visitor opens the page of an artist credited on published images
- **THEN** the artist's name, links and published images are shown

#### Scenario: Artist with only drafts
- **WHEN** a visitor opens the page of an artist whose images are all drafts
- **THEN** the artist's name and links are shown with no images

### Requirement: Link previews never show NSFW
When a link to the public site is shared, the preview SHALL use the image's preview image, title and artist for SFW images only. A link to an NSFW image SHALL produce a preview without any image of it.

#### Scenario: Sharing an SFW image
- **WHEN** a link to a published SFW image is shared on a platform that shows link previews
- **THEN** the preview shows the image's preview image and its title

#### Scenario: Sharing an NSFW image
- **WHEN** a link to a published NSFW image is shared
- **THEN** the preview contains no image of it

### Requirement: Pages work without JavaScript for crawlers
Public pages SHALL deliver their content as complete HTML on first load, so that link-preview bots and search engines see the content without running scripts. That first-load HTML SHALL always be the NSFW-hidden view.

#### Scenario: Crawler opens the gallery
- **WHEN** a client without JavaScript requests the gallery
- **THEN** the response contains the first page of published SFW images and no NSFW images

### Requirement: NSFW images stay out of search
NSFW image pages SHALL be marked so that search engines do not index them, and NSFW images SHALL never appear in any page's search or preview metadata.

#### Scenario: Search engine visits an NSFW page
- **WHEN** a search engine requests the page of an NSFW image
- **THEN** the page tells search engines not to index it

### Requirement: Published changes appear within 5 minutes
After the owner publishes, unpublishes or edits an image, the change SHALL be visible on every public page within 5 minutes.

#### Scenario: Publishing
- **WHEN** the owner publishes an image
- **THEN** it appears on the public gallery within 5 minutes

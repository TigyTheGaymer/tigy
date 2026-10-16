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
NSFW images SHALL be left out of every public list.

#### Scenario: First visit
- **WHEN** a visitor opens the gallery for the first time
- **THEN** no NSFW images are listed

### Requirement: Image page
Each published image SHALL have a page at `/i/{id}` that shows the full-view version and the image's title, date, set and description, wherever those are set.

#### Scenario: Opening an image
- **WHEN** a visitor opens `/i/{id}` for a published SFW image
- **THEN** the full-view version is shown with the image's details

#### Scenario: Draft or unknown image
- **WHEN** a visitor opens `/i/{id}` for a draft or for an ID that does not exist
- **THEN** a "not found" page is shown and no image file address is revealed

### Requirement: Other versions in the same set
An image page SHALL show the other published SFW images in the same set. NSFW versions SHALL be left out.

#### Scenario: Clean version page
- **WHEN** a visitor views a clean image whose set also has an NSFW version
- **THEN** the NSFW version is not shown among the other versions

### Requirement: Downloading the original
Every published image's page SHALL offer a download of its master file.

#### Scenario: Download
- **WHEN** a visitor uses the download option on an image page
- **THEN** the master file is downloaded under its readable filename

### Requirement: Web images are served from nearby caches
Thumbnails, full-view versions and preview images SHALL be served from the public site's own image addresses, with response headers that let shared caches keep them long-term, so visitors anywhere load them from a nearby cache. An image address SHALL only serve files of a published image. The master download SHALL use the file address recorded on the image's entry.

#### Scenario: Thumbnail request
- **WHEN** a visitor's browser requests the thumbnail of a published image from the public site
- **THEN** the thumbnail is returned with headers that allow shared caches to keep it long-term

#### Scenario: Draft or unknown image
- **WHEN** someone requests a public-site image address for a draft or an unknown ID
- **THEN** the response is not found

#### Scenario: Unpublished image
- **WHEN** an image has been unpublished and its image address is requested from the public site, without a cached copy in between
- **THEN** the response is not found

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

### Requirement: Published changes appear within 5 minutes
After the owner publishes, unpublishes or edits an image, the change SHALL be visible on every public page within 5 minutes.

#### Scenario: Publishing
- **WHEN** the owner publishes an image
- **THEN** it appears on the public gallery within 5 minutes

# Spec Delta

## MODIFIED Requirements

### Requirement: Public addresses
The public site SHALL serve the home page at `/`, an artwork's page at `/i/{id}`, the privacy page at `/privacy`, `/sitemap.xml`, `/robots.txt`, image files under `/img/` and avatars under `/avatars/`. People and tags SHALL NOT have pages of their own. Every other address, and an artwork that does not exist or is not published, SHALL render the not-found page with HTTP status 404 and a link to the home page.

#### Scenario: Unknown address
- **WHEN** a visitor opens `/no-such-page` or `/p/tigy`
- **THEN** the not-found page is shown with status 404 and a link home

#### Scenario: Unpublished artwork link
- **WHEN** a visitor opens the address of an unpublished artwork
- **THEN** the not-found page is shown with status 404

#### Scenario: Privacy page
- **WHEN** a visitor opens `/privacy`
- **THEN** the privacy page is shown with status 200

### Requirement: Link previews and the safe link
An artwork page SHALL carry its real title, description and full image in link-preview metadata. With `?safe` in the address, and on the home, privacy and not-found pages, it SHALL carry only the site card: the name "Tigy", the description "Tigy" and Tigy's avatar as a small card. An NSFW artwork page SHALL offer both its link and its safe link.

#### Scenario: Safe link to an NSFW piece
- **WHEN** a chat app fetches `/i/{id}?safe` for an NSFW piece
- **THEN** the preview metadata carries only the site card, with no title, description or image of the piece

#### Scenario: Link to the privacy page
- **WHEN** a chat app fetches `/privacy`
- **THEN** the preview metadata carries only the site card

# Spec Delta

## Purpose

Keeps the public site free of anything that needs a visitor's consent, and tells visitors what the site and its hosting keep about them, as the Swiss Data Protection Act and Telecommunications Act ask.

## ADDED Requirements

### Requirement: No cookies and nothing from other sites
The public site SHALL set no cookies, and its pages SHALL load no scripts, styles, fonts, images, frames or data from any address but the site's own. Links to other sites, such as social profiles, SHALL stay plain links that load nothing until the visitor follows them.

#### Scenario: Browsing the site
- **WHEN** a visitor opens the home page, turns the NSFW switch on, opens an artwork page and the privacy page
- **THEN** no response sets a cookie, the browser holds no cookie for the site, and every request goes to the site's own address

#### Scenario: Social links
- **WHEN** a visitor opens the home page, which shows Tigy's social links
- **THEN** nothing is requested from those networks

### Requirement: Privacy page
The privacy page SHALL say who runs the site, in which country, and how to reach them; that the site sets no cookies and uses no analytics, tracking or content from other sites; what the hosting records about each request, who keeps it, in which countries and for how long; and, in general terms, what is kept in the browser, what for, how long it lasts, and that the visitor can refuse or clear it in the browser's settings.

#### Scenario: Reading the privacy page
- **WHEN** a visitor opens `/privacy`
- **THEN** the page names the site's operator and a contact, states there are no cookies or tracking, describes the request logs, and says in general terms that display settings are kept until changed and gallery position and chosen pieces until the tab closes

### Requirement: Every page links to the privacy page
Every page SHALL end with a footer holding a single link to `/privacy`, and the link SHALL appear nowhere else. On the home page the footer follows the gallery, so it shows once every piece has loaded.

#### Scenario: Footer on an artwork page
- **WHEN** a visitor opens an artwork page
- **THEN** the page ends with a footer linking to the privacy page

#### Scenario: Footer on the not-found page
- **WHEN** a visitor opens an address that does not exist
- **THEN** the page ends with a footer linking to the privacy page

#### Scenario: Footer on the home page
- **WHEN** a visitor scrolls the home page until no more pieces load
- **THEN** the page ends with a footer linking to the privacy page

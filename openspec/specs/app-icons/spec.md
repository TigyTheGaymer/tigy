# app-icons Specification

## Purpose

The icons the public site and the admin app give browsers, so a Tigy tab, bookmark or home-screen shortcut shows the Tigy mark instead of a generic one.

## Requirements

### Requirement: Tigy mark as the favicon
The public site and the admin app SHALL each show the Tigy mark (the three strokes beside "Tigy" in the top bar) as their favicon, in maroon on a rounded fur-coloured square. Both apps SHALL serve the same icon, and neither SHALL serve Angular's default favicon.

#### Scenario: Public tab
- **WHEN** a visitor opens any page of the public site
- **THEN** the browser tab shows the maroon Tigy mark on a fur-coloured square

#### Scenario: Admin tab
- **WHEN** the owner opens any admin page
- **THEN** the browser tab shows the same icon as the public site

#### Scenario: Dark browser theme
- **WHEN** the browser's own interface is dark
- **THEN** the icon is still clearly visible, because it carries its own background

### Requirement: Icon formats
Each app SHALL declare a scalable SVG icon in its pages, SHALL answer `/favicon.ico` with the same icon for browsers and tools that ask for it directly, and SHALL declare a 180×180 PNG touch icon for home-screen shortcuts.

#### Scenario: Browser asks for /favicon.ico
- **WHEN** a client requests `/favicon.ico` from either app
- **THEN** it receives an ICO of the Tigy mark icon, not Angular's default

#### Scenario: Adding to an iPhone home screen
- **WHEN** a visitor adds the public site to an iPhone home screen
- **THEN** the shortcut shows the Tigy mark icon

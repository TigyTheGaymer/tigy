# Spec Delta

## ADDED Requirements

### Requirement: Age check before NSFW art

Before the site first shows NSFW art in a browser, it SHALL open a dialog asking for the visitor's birthday. A birthday of 18 or more years ago SHALL pass, carry out what the visitor asked, and be remembered in that browser so the site never asks again. The site SHALL remember only that the check passed, never the birthday, and SHALL send it nowhere.

#### Scenario: Passing the check

- **WHEN** a visitor who has never passed the check enters a birthday at least 18 years ago and confirms
- **THEN** the dialog closes, the requested NSFW art shows, and the browser keeps that the check passed but not the birthday

#### Scenario: Turning 18 today

- **WHEN** the visitor's 18th birthday is today
- **THEN** the check passes

#### Scenario: Already passed

- **WHEN** a visitor who passed the check in this browser asks to see NSFW art again, on a later visit
- **THEN** no dialog opens and the art shows at once

#### Scenario: No storage

- **WHEN** the browser refuses site storage and the visitor passes the check
- **THEN** the requested NSFW art shows, and the dialog opens again after the page is reloaded

### Requirement: Age check turns down visitors under 18

A birthday less than 18 years ago SHALL turn the request down: the dialog SHALL say that NSFW art isn't available, show no NSFW art, and remember nothing, so the next request asks again. A missing or future birthday SHALL NOT be accepted. Closing the dialog without confirming SHALL leave everything as it was.

#### Scenario: Under 18

- **WHEN** a visitor enters a birthday less than 18 years ago and confirms
- **THEN** the dialog says NSFW art isn't available, the switch stays off, and the next request to see NSFW art opens the dialog again

#### Scenario: Invalid birthday

- **WHEN** the visitor confirms with no birthday or a birthday in the future
- **THEN** the dialog stays open and asks for a valid birthday

#### Scenario: Closing the dialog

- **WHEN** the visitor closes the dialog with Escape or its close button
- **THEN** the switch stays off, the piece stays covered, and focus returns to the control that opened the dialog

## MODIFIED Requirements

### Requirement: NSFW switch

The pages SHALL offer a "Show NSFW" switch, off by default and remembered only in the visitor's browser. Turning it on SHALL wait for the age check to pass, and a switch stored on without a passed check SHALL load off. The first HTML of every page SHALL be the switch-off view. With the switch on, the page SHALL show that view at once and then replace the gallery, or the previous and next links, with the NSFW-inclusive ones once they arrive.

#### Scenario: Turning the switch on

- **WHEN** a visitor who has passed the age check turns the switch on on the home page
- **THEN** the gallery reloads from its first piece with NSFW pieces in date order, and the choice holds on the next visit in that browser

#### Scenario: Turning the switch on for the first time

- **WHEN** a visitor who has never passed the age check turns the switch on
- **THEN** the switch stays off and the age check dialog opens, and the switch turns on only once the check passes

#### Scenario: Switch already on

- **WHEN** a visitor whose switch is on opens the home page
- **THEN** the SFW gallery shows at once and is replaced by the NSFW-inclusive gallery when it arrives

#### Scenario: Switch stored on before the age check existed

- **WHEN** a visitor whose browser holds the switch on but has never passed the age check opens a page
- **THEN** the switch shows off and the gallery shows no NSFW pieces

### Requirement: NSFW confirm screen

An NSFW artwork page opened with the switch off SHALL show its details behind a confirm screen, without the image, offering to show this piece or to turn the switch on. Both choices SHALL go through the age check first and take effect only when it passes. Showing this piece SHALL reveal the image without another request for the piece's data and SHALL be remembered for that piece until the browser session ends.

#### Scenario: Confirming one piece

- **WHEN** a visitor with the switch off who has passed the age check opens an NSFW piece and chooses to show it
- **THEN** the image appears and the switch stays off

#### Scenario: Confirming one piece for the first time

- **WHEN** a visitor who has never passed the age check chooses to show an NSFW piece
- **THEN** the age check dialog opens, and the image appears only once the check passes, with the switch still off

#### Scenario: Showing NSFW everywhere for the first time

- **WHEN** a visitor who has never passed the age check chooses to show NSFW everywhere
- **THEN** the age check dialog opens, and the switch turns on and the image appears only once the check passes

#### Scenario: Coming back to a confirmed piece

- **WHEN** the visitor returns to that piece later in the same browser session
- **THEN** the image shows without asking again

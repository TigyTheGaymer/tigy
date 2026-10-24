# people-editing Specification

## Purpose

Defines how the owner manages the people credited on artworks in the admin: the People page, creating and naming people, their social links and avatars, and deleting them.

## Requirements

### Requirement: The People page lists everyone

The People page SHALL list every person with their avatar, name and the number of artworks, published or not, that credit them. Tigy SHALL come first and be marked as the site's own person; the others SHALL follow by name, ignoring case. A search SHALL keep the people whose names contain the typed text, ignoring case. The list SHALL update without reloading.

#### Scenario: Opening the People page

- **WHEN** the owner opens the People page with Tigy, "kitsu" and "Bramble" stored
- **THEN** the list shows Tigy marked as the site's own person, then Bramble, then kitsu, each with their credit count

### Requirement: The owner creates a person

The People page SHALL let the owner create a person by giving a name. A name SHALL be required and SHALL be stored trimmed. A person created from an artwork's credit picker SHALL be the same as one created here.

#### Scenario: Creating a person

- **WHEN** the owner creates a person named " Bramble "
- **THEN** a person named "Bramble" with no links and no avatar exists, and the person editor opens for them

#### Scenario: Empty name

- **WHEN** the owner tries to create or save a person with an empty name
- **THEN** the admin says a name is required and does not save

### Requirement: The owner edits a person's name and links

The person editor SHALL let the owner change the name and add, reorder, edit and remove social links. Each link SHALL have a network, a handle and an `https` address, all required. The editor SHALL suggest the networks the site has logos for, and SHALL accept any other network name. Edits SHALL be saved together and leaving with unsaved edits SHALL ask first, as in the artwork editor.

#### Scenario: Adding a link

- **WHEN** the owner adds a Bluesky link with handle "@bramble.bsky.social" and its address to Bramble and saves
- **THEN** every artwork crediting Bramble shows the link with the Bluesky logo within 10 minutes

#### Scenario: Address that is not https

- **WHEN** the owner enters "bramble.example" or an `http` address as a link's address
- **THEN** the editor says the address must start with https:// and does not save

#### Scenario: Reordering Tigy's links

- **WHEN** the owner moves Tigy's Telegram link above the Bluesky link and saves
- **THEN** the home header shows Telegram before Bluesky within 10 minutes

#### Scenario: Renaming Tigy

- **WHEN** the owner changes Tigy's name and saves
- **THEN** the home header and every credit of Tigy show the new name within 10 minutes

### Requirement: Pasting a profile address fills in the link

When the owner enters a profile address of a network the site has a logo for, the editor SHALL fill in that link's network and the handle read from the address, unless the owner has already typed them. The filled fields SHALL stay editable. An address of any other site SHALL leave the network and handle to the owner.

#### Scenario: Bluesky profile

- **WHEN** the owner pastes `https://bsky.app/profile/bramble.bsky.social` into a new link's address
- **THEN** the network becomes Bluesky and the handle "@bramble.bsky.social"

#### Scenario: Fur Affinity profile

- **WHEN** the owner pastes `https://www.furaffinity.net/user/bramble/` into a new link's address
- **THEN** the network becomes Fur Affinity and the handle "bramble"

#### Scenario: Twitter under its new address

- **WHEN** the owner pastes `https://x.com/bramble` into a new link's address
- **THEN** the network becomes Twitter and the handle "@bramble", shown with the Twitter logo

#### Scenario: Unknown site

- **WHEN** the owner pastes `https://bramble.example/art` into a new link's address
- **THEN** the network and handle stay empty for the owner to fill in

### Requirement: The owner sets a person's avatar

The person editor SHALL let the owner pick a JPEG, PNG, GIF or WebP image, choose a square part of it by dragging and zooming, and save it as the person's avatar. The saved avatar SHALL be a still square of at most 512 pixels a side and SHALL carry no metadata from the picked file. The owner SHALL be able to replace or remove the avatar.

#### Scenario: Setting an avatar from a photo

- **WHEN** the owner picks a 4000 by 3000 pixel JPEG with GPS data, zooms in on the face and saves
- **THEN** the person's avatar is a 512 by 512 pixel image of the chosen square, without the GPS data, and it shows on their credits and in the admin

#### Scenario: Cropping on a phone

- **WHEN** the owner sets an avatar on a phone
- **THEN** they can move the crop with one finger and zoom it by pinching

#### Scenario: Small picture

- **WHEN** the owner picks a 300 by 200 pixel image and keeps the largest square
- **THEN** the avatar is a 200 by 200 pixel image

#### Scenario: Removing the avatar

- **WHEN** the owner removes a person's avatar and saves
- **THEN** the person has no avatar, and their avatar address returns 404 within 10 minutes

#### Scenario: Unsupported file

- **WHEN** the owner picks a HEIC photo as an avatar
- **THEN** the admin says that only JPEG, PNG, GIF and WebP are supported and keeps the current avatar

### Requirement: Deleting a person from the admin

The person editor SHALL let the owner delete a person after confirming. When artworks credit the person, the admin SHALL refuse as `gallery-catalog` describes and SHALL link each of those artworks to its editor. Tigy SHALL NOT be offered for deletion. Deleting a person SHALL also delete their avatar.

#### Scenario: Deleting an uncredited person

- **WHEN** the owner deletes a person with an avatar whom no artwork credits, and confirms
- **THEN** the person is gone from the People page and the pickers, and their avatar address returns 404 within 10 minutes

#### Scenario: Deleting a credited person

- **WHEN** the owner tries to delete a person credited on two artworks, one of them unpublished
- **THEN** the admin refuses, names both artworks with links to their editors, and the person stays

#### Scenario: Tigy

- **WHEN** the owner opens Tigy in the person editor
- **THEN** no delete action is offered

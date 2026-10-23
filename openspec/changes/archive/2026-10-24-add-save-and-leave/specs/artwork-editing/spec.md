## ADDED Requirements

### Requirement: Leaving the editor can save first

When the owner moves from the artwork editor to another admin page, or to the previous or next artwork, while edits are unsaved, the question SHALL offer Save and leave besides Stay and Leave. Save and leave SHALL save the edits as Save does and then go where the owner was going. When the save does not go through, the editor SHALL stay open with the edits kept and say why, as Save does.

#### Scenario: Saving on the way out

- **WHEN** the owner changes the title, opens the People page and chooses Save and leave
- **THEN** the title is stored, the editor confirms the save, and the People page opens

#### Scenario: Leaving without saving

- **WHEN** the owner changes the title, opens the People page and chooses Leave
- **THEN** the People page opens and the title is not stored

#### Scenario: Staying

- **WHEN** the owner changes the title, opens the People page and chooses Stay
- **THEN** the editor stays open with the changed title still unsaved

#### Scenario: Moving to the next artwork

- **WHEN** the owner changes the title, presses Alt+Right and chooses Save and leave
- **THEN** the title is stored and the next artwork opens

#### Scenario: Date that does not exist

- **WHEN** the owner enters 31 February, opens the People page and chooses Save and leave
- **THEN** the editor stays open, shows the date error and keeps the edits

#### Scenario: Backing out of publishing with missing details

- **WHEN** the owner publishes a piece with no artist, opens the People page, chooses Save and leave, and then Keep editing when asked about the missing details
- **THEN** nothing is stored and the editor stays open with the edits

#### Scenario: Save fails on the way out

- **WHEN** the owner chooses Save and leave and saving fails because the connection is lost
- **THEN** the editor says the edits were not saved, stays open and keeps them

#### Scenario: Closing the tab

- **WHEN** the owner closes or reloads the tab with unsaved edits
- **THEN** the browser asks with its own question, which has no Save and leave

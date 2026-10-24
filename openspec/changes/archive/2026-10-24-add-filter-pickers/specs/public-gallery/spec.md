# Spec Delta

## MODIFIED Requirements

### Requirement: Filter row

The gallery SHALL show a filter row with four filter pickers (Characters, Artists, Tags and Year), a sort chip that switches between newest and oldest first and, while any filter is active, a "Clear all" chip that removes every filter and keeps the sort. A picker with active filters SHALL show how many. Pressing a picker SHALL open its list of choices, as a dropdown under the picker on wide screens and as a sheet along the bottom edge on phones. Each choice SHALL show its name and how many pieces it has; characters and artists SHALL also show their avatar. Pressing a choice SHALL apply it at once, changing the gallery and its address, and SHALL leave the picker open. Active choices SHALL be shown as selected, and pressing one SHALL remove it. Picking a second year SHALL add it, so the gallery shows pieces from either year. The Characters, Artists and Tags pickers SHALL have a search field that narrows the list to choices whose name contains the typed text, ignoring case. Escape, a press outside the picker or its close button SHALL close it and return focus to its chip.

#### Scenario: Removing a filter chip

- **WHEN** a visitor on a gallery filtered by two characters, a tag and a year presses "Clear all"
- **THEN** the gallery shows every piece from the first, in the same sort, and no picker shows an active filter

#### Scenario: Many filters

- **WHEN** a visitor has two characters, an artist, two tags and a year active
- **THEN** the pickers show "Characters · 2", "Artists · 1", "Tags · 2" and "Year · 1", and the filter row fits without cutting anything off

#### Scenario: Pressing a picker

- **WHEN** a visitor on a wide screen presses the Tags picker
- **THEN** a dropdown opens under it listing the tags with how many pieces each has, and the gallery does not change

#### Scenario: Picking a tag

- **WHEN** a visitor opens the Tags picker and presses the tag "comic"
- **THEN** the gallery shows the pieces tagged "comic" from the first piece, the address carries the tag, the Tags picker shows one active filter, and the picker stays open with "comic" selected

#### Scenario: Picking a second character

- **WHEN** a visitor on a gallery filtered by one character picks another character in the open picker
- **THEN** the gallery shows only pieces with both characters

#### Scenario: Unpicking a choice

- **WHEN** a visitor presses a selected choice in an open picker
- **THEN** that filter is removed and the choice is no longer selected

#### Scenario: Picking a second year

- **WHEN** a visitor on a gallery filtered by 2024 picks 2025 in the Year picker
- **THEN** the gallery shows the pieces from 2024 and from 2025, and the Year picker shows "Year · 2"

#### Scenario: Searching a picker

- **WHEN** a visitor types "bra" in the Characters picker's search field
- **THEN** the list shows only characters whose name contains "bra", such as "Bramble"

#### Scenario: Picker on a phone

- **WHEN** a visitor on a phone presses the Artists picker
- **THEN** the choices open in a sheet along the bottom edge

#### Scenario: Closing a picker

- **WHEN** a visitor presses Escape in an open picker
- **THEN** the picker closes and focus returns to its chip

## ADDED Requirements

### Requirement: Open pickers stay steady

Picking or unpicking a choice SHALL NOT move the open picker or the choices in it. The pickers SHALL come first in the filter row. While a picker is open, its choices SHALL keep their opening order: a choice that stops matching SHALL stay in place, unavailable with 0 pieces, and a choice that starts matching SHALL go at the end.

#### Scenario: Picking keeps the list in place

- **WHEN** a visitor opens the Tags picker and picks "comic"
- **THEN** the Tags picker and its dropdown stay where they were, every tag stays in its place, and the tags not found on pieces tagged "comic" are shown as unavailable with 0 pieces

#### Scenario: Pressing an unavailable choice

- **WHEN** a visitor presses a choice shown as unavailable
- **THEN** nothing changes

#### Scenario: Reopening the picker

- **WHEN** a visitor closes the Tags picker after picking "comic" and opens it again
- **THEN** it lists only the tags found on pieces tagged "comic", with "comic" first

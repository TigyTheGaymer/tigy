# Spec Delta

## ADDED Requirements

### Requirement: Filter choices narrow to matching pieces

The filter pickers SHALL offer only the characters, artists, tags and years found on visible pieces that match every active filter, each with the number of those pieces it appears on, most pieces first. The choices SHALL cover every matching piece, not only the pages loaded so far, and SHALL arrive with the gallery's first page, so opening a picker waits for no further request.

#### Scenario: Choices with a filter active

- **WHEN** a visitor on a gallery filtered by the tag "comic" opens the Characters picker
- **THEN** it offers only characters who appear on pieces tagged "comic", each with the number of those pieces

#### Scenario: No dead ends

- **WHEN** a visitor picks any choice a picker offers
- **THEN** the gallery shows at least one piece

#### Scenario: NSFW only choice with the switch off

- **WHEN** a character appears only on NSFW pieces and a visitor with the switch off opens the Characters picker
- **THEN** the picker does not offer that character

### Requirement: Year choices ignore the active years

The year choices SHALL be worked out from the pieces matching every active filter except the years, so the visitor can add another year that matches the other filters.

#### Scenario: Adding a year

- **WHEN** a visitor on a gallery filtered by a character and the year 2024 opens the Year picker
- **THEN** it offers every year that has a visible piece with that character, 2024 included

## MODIFIED Requirements

### Requirement: Filters combine

The gallery SHALL accept filters by character, artist, tag and year, any of them at the same time. A piece SHALL be listed only when it matches every active filter. Several characters, artists or tags SHALL all match, while several years SHALL match a piece from any of them.

#### Scenario: Character, artist and year together

- **WHEN** a visitor filters by one character, one artist and the year 2025
- **THEN** the gallery lists only pieces from 2025 that credit that artist and show that character

#### Scenario: Several years

- **WHEN** a visitor filters by the years 2024 and 2025
- **THEN** the gallery lists every piece from 2024 or 2025

#### Scenario: No matches

- **WHEN** no piece matches the active filters
- **THEN** the gallery shows that nothing matches and offers to clear the filters

### Requirement: Filtered links are complete pages

The page address SHALL carry the active filters and sort. Opening such an address SHALL return a server-rendered page whose first HTML already lists the first page of the filtered, sorted pieces and shows which filter pickers have active filters.

#### Scenario: Shared filtered link

- **WHEN** a visitor opens a link to the gallery filtered by a character and a tag and sorted oldest first
- **THEN** the first HTML contains the oldest 24 matching pieces, and the filter row shows the Characters and Tags pickers with one active filter each and the sort as oldest first

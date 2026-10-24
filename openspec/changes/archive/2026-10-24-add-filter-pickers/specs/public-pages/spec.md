# Spec Delta

## MODIFIED Requirements

### Requirement: Filters from the address

The home page SHALL apply the filters and sort the address carries. Each filter picker SHALL show how many of its filters are active and SHALL list every active filter as selected so it can be removed: people by name, and a person who does not exist as "Unknown person". It SHALL offer newest first and oldest first. When nothing matches, it SHALL say so and offer to clear the filters.

#### Scenario: Shared filtered link

- **WHEN** a visitor opens a link filtered by a character and a tag, sorted oldest first
- **THEN** the first HTML lists the oldest 24 matching pieces, shows one active filter on the Characters and the Tags pickers, and shows the sort as oldest first

#### Scenario: Removing a filter

- **WHEN** the visitor opens the Tags picker and presses the selected tag
- **THEN** the gallery shows the pieces matching the remaining filters, from the first piece

#### Scenario: Unknown person

- **WHEN** a visitor opens a gallery link filtered by a person ID that matches nobody
- **THEN** the picker for that person shows one active filter and lists it as "Unknown person", selected, so it can be removed; the page says nothing matches and offers to clear the filters

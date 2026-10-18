# Spec Delta

## MODIFIED Requirements

### Requirement: People and artworks are addressed by ID

A person filter SHALL identify the person by a stable ID, and an artwork's address SHALL identify the artwork by its ID, so renaming a person or retitling an artwork never breaks a shared link. People SHALL NOT have pages of their own: they appear only as credits on artworks.

#### Scenario: Renaming a person

- **WHEN** the owner renames a character whose gallery filter link was shared earlier
- **THEN** the shared link still filters by that character, showing the new name

### Requirement: Tigy is the site's own person

Exactly one person SHALL be the site's own: Tigy. A credit for Tigy SHALL link to the home page and show no social links. The home header's avatar and the owner's social links SHALL come from that person.

#### Scenario: Tigy credited as a character

- **WHEN** an artwork credits Tigy as a character
- **THEN** the credit links to the home page and shows no social links

#### Scenario: Owner edits a social link

- **WHEN** the owner changes a link on Tigy's person in the admin
- **THEN** the home header shows the new link within 10 minutes

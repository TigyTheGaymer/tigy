## ADDED Requirements

### Requirement: The owner credits Tigy on every artwork at once
The admin SHALL offer the owner one action that credits Tigy as a character on every artwork, published or not, that does not credit Tigy yet. It SHALL put Tigy first among that artwork's characters and SHALL keep the other characters, the artists and every other field as they were. Artworks that already credit Tigy, in any position, SHALL stay unchanged. When it finishes, the admin SHALL say how many artworks it changed. Only the owner SHALL be able to run it.

#### Scenario: Crediting the existing catalog
- **WHEN** the catalog has five artworks, two of which already credit Tigy, and the owner runs the action
- **THEN** the other three credit Tigy, and the admin says it changed 3 artworks

#### Scenario: Other characters keep their order
- **WHEN** an artwork credits the characters Bramble then kitsu, and the owner runs the action
- **THEN** it credits Tigy, Bramble, then kitsu

#### Scenario: Running it again
- **WHEN** the owner runs the action a second time with no new artworks since
- **THEN** no artwork changes, and the admin says every artwork already credits Tigy

#### Scenario: Gallery filter follows
- **WHEN** the owner has run the action on a catalog with published pieces that lacked the credit
- **THEN** within 10 minutes the home gallery filtered by Tigy includes those pieces

#### Scenario: Not the owner
- **WHEN** a signed-out browser or another account tries to run the action
- **THEN** it is refused and no artwork changes

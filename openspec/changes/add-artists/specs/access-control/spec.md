# Spec Delta

## ADDED Requirements

### Requirement: Artists are publicly readable
Anyone SHALL be able to read artist records. Only the owner SHALL be able to write them.

#### Scenario: Reading an artist
- **WHEN** a request that is not signed in reads an artist record
- **THEN** the request succeeds

# Spec Delta

## MODIFIED Requirements

### Requirement: The owner signs in with Google
The admin SHALL offer only Google sign-in. When the owner signs in with the owner's Google account, the admin SHALL open with the owner's access, and SHALL keep the owner signed in on that browser until they sign out.

#### Scenario: Owner signs in
- **WHEN** the owner opens the admin while signed out and signs in with the owner's Google account
- **THEN** the admin opens the Artworks page

#### Scenario: Coming back later
- **WHEN** the owner closes the admin and opens it again in the same browser
- **THEN** the admin opens without asking them to sign in again

### Requirement: Admin pages require the owner
Every admin page SHALL show its content only to the signed-in owner. Opening any admin address while signed out SHALL show the sign-in page, and signing in SHALL then open the address that was asked for.

#### Scenario: Signed-out link to the Uploads page
- **WHEN** a signed-out visitor opens the admin's Uploads address
- **THEN** the sign-in page is shown, no upload is listed, and after the owner signs in the Uploads page opens

#### Scenario: Signed-out link to an artwork
- **WHEN** a signed-out visitor opens the admin address of an artwork's editor
- **THEN** the sign-in page is shown, nothing of the artwork is shown, and after the owner signs in that artwork's editor opens

#### Scenario: Unknown admin address
- **WHEN** the signed-in owner opens an admin address that does not exist
- **THEN** the admin shows the Artworks page

# admin-access Specification

## Purpose

Defines who can use the private admin: the owner signs in with Google, every other account is refused before it is created, and every admin page requires the owner's sign-in.

## Requirements

### Requirement: The owner signs in with Google
The admin SHALL offer only Google sign-in. When the owner signs in with the owner's Google account, the admin SHALL open with the owner's access, and SHALL keep the owner signed in on that browser until they sign out.

#### Scenario: Owner signs in
- **WHEN** the owner opens the admin while signed out and signs in with the owner's Google account
- **THEN** the admin opens the Uploads page

#### Scenario: Coming back later
- **WHEN** the owner closes the admin and opens it again in the same browser
- **THEN** the admin opens without asking them to sign in again

### Requirement: Other accounts are refused
Signing in with any Google account other than the owner's SHALL fail. No account SHALL be created for it, it SHALL get no access to any data, and the admin SHALL say that only the owner can sign in.

#### Scenario: Stranger signs in
- **WHEN** someone signs in to the admin with a Google account that is not the owner's
- **THEN** sign-in fails with a message that only the owner can sign in, and no account is created for them

### Requirement: Admin pages require the owner
Every admin page SHALL show its content only to the signed-in owner. Opening any admin address while signed out SHALL show the sign-in page, and signing in SHALL then open the address that was asked for.

#### Scenario: Signed-out link to the Uploads page
- **WHEN** a signed-out visitor opens the admin's Uploads address
- **THEN** the sign-in page is shown, no upload is listed, and after the owner signs in the Uploads page opens

#### Scenario: Unknown admin address
- **WHEN** the signed-in owner opens an admin address that does not exist
- **THEN** the admin shows the Uploads page

### Requirement: The owner can sign out
The admin SHALL show which account is signed in and SHALL let the owner sign out. After signing out, the admin SHALL show the sign-in page and SHALL NOT show any data until the owner signs in again.

#### Scenario: Signing out
- **WHEN** the owner chooses sign out
- **THEN** the sign-in page is shown, and going back in the browser does not show the uploads again

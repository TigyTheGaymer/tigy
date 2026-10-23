# Spec Delta

## MODIFIED Requirements

### Requirement: Home header with social links
The home page SHALL open with a header showing Tigy's avatar, the name, the bio "A tiger", the number of published pieces and the owner's social links. The public site's only footer SHALL be the privacy footer, which holds nothing but the link to the privacy page.

#### Scenario: Visitor opens the home page
- **WHEN** a visitor opens the home page
- **THEN** the header shows the avatar, the name, the bio, the piece count and the social links above the gallery

#### Scenario: No footer
- **WHEN** a visitor scrolls to the end of the home page or opens an artwork page
- **THEN** the only footer is the privacy footer, and the social links are not repeated

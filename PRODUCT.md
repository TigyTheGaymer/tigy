# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Angular, confirmed by the owner. Two apps in an Nx workspace: the public site (`apps/public`, Angular with server-side rendering on Firebase App Hosting) and a private admin (`apps/admin`, Angular single-page app on Firebase Hosting), backed by Cloud Functions, Firestore and Storage. Design mockups before the build are plain static HTML, CSS and vanilla JavaScript under `design/mockups/`.

## Users

- **Primary:** the owner's followers and friends, mostly arriving from a link in a social post, often on a phone. They come to look at the art of Tigy, see who drew it, and find the owner's other socials.
- **Also:** the artists who drew the pieces and the people whose characters appear in them, who look for their credit.
- **The owner** manages everything in the private admin; the public site has no visitor accounts.

## Product Purpose

**Tigy** is a showcase of art of Tigy, the owner's fursona (a tiger), much of it commissioned from different artists, and a contact hub that links to the owner's socials. Success: a visitor arriving from a shared link sees the art at its best, knows who made it and who the characters are, and finds the owner's socials without searching.

## Positioning

One character's own home, not a feed: every piece is shown with full credit to its artists and to the characters in it, and nothing else competes with the art.

## Operating Context

- Visitors usually land on the home page or directly on one artwork's page (`/i/{id}`) from a social post.
- Artwork ranges from transparent sticker-style pieces (square) to tall comics with text and wide, detailed reference sheets; some pieces are animated.
- Pieces can show several characters and can be collaborations of several artists. Artists and characters are both people: one person can be credited as an artist, as a character, or both, and characters have no separate owner.
- Some art is NSFW. It stays out of the gallery by default, behind a visitor-side "show NSFW" switch; a direct link to it asks for confirmation first; and it is never indexed by search engines. A shared artwork link previews the piece's title and image by default, NSFW included; the "safe" link shows only a generic site card.

## Capabilities and Constraints

- Public pages: home (Tigy intro, socials, gallery by date), artwork detail, and not found (`add-public-pages`). People and tags have no pages of their own: people appear as credits and tags are gallery filters. Pages are server-rendered and CDN-cached for up to 5 minutes; the first HTML is always the NSFW-hidden view.
- The gallery lists published art newest first, 24 at a time. Images without a date sort by the day they were added.
- Artwork pages offer a fullscreen view with zoom, previous/next, share, download of the original, and back to the gallery.
- Site copy is in English only. The site goes by the name **Tigy**.
- **Data model (decided, `openspec/changes/define-data-model`):** artworks and people, both addressed by ID. People have a name, an avatar and links, with no bio, reference sheet or slug; Tigy is the fixed person `tigy`. Tags are flat, lowercase words or phrases. A clean and an NSFW version of a piece are two separate artworks.
- Planning follows the OpenSpec spec-driven workflow (`openspec/`); the public site's design work is the change `design-public-site`, and its data is the change `define-data-model`.

## Brand Commitments

- The name is **Tigy**. The character's own colours (tiger orange, cream, deep maroon stripes, pink nose and pads) are available as brand material but are not a binding palette.
- The site must not feel like a corporate or agency portfolio, a dark and edgy gamer site, or a generic social-media feed. Cute is welcome; the art itself ranges from chibi stickers to detailed painted pieces.

## Evidence on Hand

- Five real pieces provided by the owner, listed with paths and dimensions in `openspec/changes/design-public-site/design.md`: two transparent chibi stickers, a three-panel comic of Tigy with another character, Tigy's reference sheet, and an animated GIF portrait. The reference sheet is SFW.
- Tigy's interests, from the reference sheet: gaming, plants, photography.
- Not provided: artist names and links, the other characters' names and links, the owner's social links. Mockups use clearly marked placeholders; never invent them.

## Product Principles

1. The art leads. Interface recedes wherever a piece is on screen.
2. Credit is first-class: artists and characters are always shown with their links.
3. Built for the shared link: a visitor landing on one artwork, on a phone, gets everything they need there.
4. Safe by default: NSFW stays out of the gallery and search unless the visitor chooses otherwise, and when shared with the safe link it stays out of link previews too.

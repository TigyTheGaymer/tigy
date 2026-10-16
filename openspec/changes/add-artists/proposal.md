# Proposal

## Why

The gallery exists to show the art together with credit to the artists who made it. After `add-nsfw-handling`, images can be published and browsed, but none of them say who drew them. This change adds artists as their own records with public links, credits them on every image, and gives each artist a page. It closes with the launch checks that confirm the whole gallery works in production.

Depends on `add-nsfw-handling` (artist pages follow the NSFW switch) and the changes before it.

## What Changes

- **Artist records** with a name and a list of public links, managed in the admin (create, edit, delete, reorder links). No private contact data.
- **Assigning an artist** to an image from the list of artists; the image keeps a copy of the artist's name and links for display.
- **Artist edits reach all their images** through a backend fan-out, drafts included. Deleting an artist leaves their images' credit untouched, and the admin flags those images.
- **Artist credit** with links on the image page, and an **artist page** (`/artists/{id}`) with the artist's links and their published images, paged and following the NSFW switch.
- **Launch checks** in production, and `PRODUCT.md` updated with the product's purpose.

Out of scope: visual design and browsing controls (separate UI/UX change), private artist contact data.

## Capabilities

### New Capabilities

- `artist-directory`: artist records with public links, how artist details appear on images, and what happens to images when an artist is edited or deleted.

### Modified Capabilities

- `admin-console`: managing artists, assigning an artist when editing an image, flagging images of deleted artists.
- `public-gallery`: artist credit on the image page and the artist page.
- `access-control`: artists are publicly readable.

## Impact

- **Code**: `libs/models` (`Artist` type), `apps/admin` (artist management, artist picker, flags), `apps/functions` (artist fan-out), `apps/public` (credit, artist page), `firebase` (artist read rule, composite indexes).
- **Docs**: apps/admin/README.md, apps/functions/README.md, PRODUCT.md.

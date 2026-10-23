# Proposal

## Why

Almost every piece on the site shows Tigy, yet each new upload starts with no characters, so the owner has to credit Tigy by hand on every artwork. The pieces already in the catalog have the same gap, which leaves Tigy's character filter incomplete.

## What Changes

- Processing an upload creates the new artwork with Tigy already credited as its only character. The owner can still remove Tigy or add other characters in the editor.
- A new owner-only callable, `creditTigy`, credits Tigy as a character on every existing artwork, published or not, that does not credit Tigy yet. It puts Tigy first in the characters, keeps the other credits in their order, and leaves artworks that already credit Tigy untouched, so running it again changes nothing.
- The admin's top-bar menu gets a "Credit Tigy on every artwork" item beside "Rebuild summaries". It runs the callable and says how many artworks it changed.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `image-upload`: "Each upload becomes an unpublished artwork" now credits Tigy as the only character instead of leaving the credits empty.
- `gallery-catalog`: adds a requirement that the owner can credit Tigy on every artwork that lacks the credit, as one action.

## Impact

- `apps/functions`: `uploads/process-upload.ts` sets `characterIds: [TIGY_ID]`; a new `people/credit-tigy.ts` callable is exported from `main.ts`. Each changed image fires `onImageWritten`, which keeps `meta/gallery` current as usual.
- `apps/admin`: `firebase/functions.ts` gains `creditTigy()` on `Callables`; `chrome/top-bar` gains the menu item, its busy state and its toasts.
- No data model, rule or index changes: `characterIds` already exists, and the admin SDK bypasses the rules.
- Deployment: after deploying, the owner runs the menu item once against production.
- Tigy's person document does not have to exist; a credit for a missing person is already left out on the artwork page.

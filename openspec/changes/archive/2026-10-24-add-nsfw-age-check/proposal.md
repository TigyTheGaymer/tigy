# Proposal

## Why

Anyone can turn the "Show NSFW" switch on, or reveal a single NSFW piece, with one click. The site should ask visitors to confirm they are adults before it shows NSFW art for the first time.

## What Changes

- The first time a visitor asks to see NSFW art in a browser, the site opens an age check dialog asking for their birthday. It asks from the header's "Show NSFW" switch and from both buttons on an artwork page's NSFW confirm screen ("Show this piece" and "Show NSFW everywhere").
- A birthday that makes the visitor 18 or older passes the check. The site then does what the visitor asked and stores in `localStorage` only that the check passed, never the birthday. After that, nothing in that browser asks again.
- A birthday under 18 turns the request down. The dialog says NSFW art isn't available, the switch stays off and the piece stays covered. Nothing is stored, so the dialog shows again the next time.
- Closing the dialog without confirming leaves everything as it was.
- A switch that was stored on before this change, with no stored age check, loads off. The visitor passes the check once to turn it back on.
- The privacy page stays as it is.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `public-pages`: adds an age check requirement. The NSFW switch and NSFW confirm screen requirements now go through it before they show NSFW art.

## Impact

- `apps/public/src/app/nsfw/`: a new age check service, which remembers the passed check in `localStorage`, and a new age check dialog component. `NsfwSwitchService` and the `NsfwSwitch` component ask the age check before turning on.
- `apps/public/src/app/artwork/artwork.ts`: `showPiece()` and `showAll()` ask the age check first.
- `apps/public/src/app/app.html`: hosts the single dialog.
- No server, API or data changes. No new dependencies. The site still sets no cookies and loads nothing from other sites.

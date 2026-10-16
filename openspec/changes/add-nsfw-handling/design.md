# Design

## Context

See proposal.md for motivation and scope. After `add-public-gallery`, the public site renders every page on the server as an anonymous visitor and always shows the SFW view (A3 in that change's design). Pages are cached at the CDN for 5 minutes (A4), lists page by `sortDate` and document ID (A5), and link previews never include NSFW images.

## Goals / Non-Goals

**Goals:**
- NSFW images never appear for a visitor who hasn't chosen to see them.
- The visitor's choice never reaches the server, so CDN caching keeps working.
- NSFW images never appear in link previews or search results.

**Non-Goals:**
- Age verification or accounts. The switch is a visitor preference, not a gate.
- Visual design of the switch and the confirm screen (separate UI/UX change).

## Decisions

### Product decisions this change builds on

- **#3 Every image has an NSFW flag.**
- **#9 NSFW images sit behind a "show NSFW" switch.** They are hidden by default, and the visitor's choice is remembered in their browser. A direct link to an NSFW image shows a confirm screen first. NSFW images are never used in link previews or SEO.

### The switch lives only in the browser

The choice is stored in browser storage and read only after hydration. The server never sees it, in line with A3: server HTML is the same for everyone and stays cacheable.

- With the switch off, nothing changes: the server's first page is used as is.
- With the switch on, the browser fetches the NSFW-inclusive list (`published == true`, `orderBy(sortDate desc)`, `orderBy(documentId)`, `limit(24)`) after hydration and replaces the SFW first page. This needs the composite index (`published`, `sortDate`, id).
- *Alternatives:* a cookie read by the server (the CDN would need a cached copy per cookie value, so caching stops working).

### The confirm screen is server-rendered for everyone

The server renders an NSFW image's page as a confirm screen without the image, identical for every visitor. After hydration, the browser skips it when the switch is on, or shows the image once the visitor confirms. NSFW pages carry `noindex`, and their preview metadata stays image-free (already true from `add-public-gallery`).

## Risks / Trade-offs

- [With the switch on, the gallery first shows the SFW page and then swaps in the NSFW-inclusive one] → accepted; the UI/UX change can soften the swap.
- [With the switch on, a direct link briefly shows the confirm screen before the image] → accepted for the same reason.
- [Browser storage can be cleared or blocked] → the switch falls back to off, which is the safe default.

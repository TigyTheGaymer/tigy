# Proposal

## Why

Both apps still show Angular's default favicon, the same file byte for byte, so a Tigy tab looks like any other Angular app. The site already has its own mark (the three strokes beside "Tigy" in the top bar), and the tab, bookmark and home-screen icon should show it.

## What Changes

- The public site and the admin app show the Tigy mark as their favicon: a maroon mark on a rounded fur-coloured square. Both apps use exactly the same icons.
- Each app serves the icon as an SVG (sharp at any size), keeps a `favicon.ico` fallback for browsers and tools that only ask for `/favicon.ico`, and adds an `apple-touch-icon` for iOS home screens.
- Angular's default `favicon.ico` is replaced in both apps.
- Out of scope: a web app manifest and installable-app icons, a theme-colour meta tag, link-preview images, and a separate look for the admin tab.

## Capabilities

### New Capabilities

- `app-icons`: the icons both apps give browsers for tabs, bookmarks and home screens.

### Modified Capabilities

None.

## Impact

- `apps/public/public/` and `apps/admin/public/`: new `favicon.svg` and `apple-touch-icon.png`, replaced `favicon.ico`.
- `apps/public/src/index.html` and `apps/admin/src/index.html`: the icon `<link>` tags.
- A source SVG for the icon, and a one-off script that renders the PNG and ICO from it using `sharp` (already installed).
- No data, API or server changes.

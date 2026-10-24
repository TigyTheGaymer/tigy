---
name: Tigy
description: A warm photo album wearing Tigy's coat — the public gallery of Tigy the tiger's art.
colors:
  fur: '#f5a742'
  fur-deep: '#e48c2b'
  fur-light: '#f9c27a'
  cream: '#fde3bc'
  cream-light: '#fff3e0'
  stripe-maroon: '#4b1416'
  stripe-maroon-soft: '#6e2422'
  paw-pink: '#f4a3ad'
  paw-pink-deep: '#e07c8b'
  night-page: '#2a0d0e'
  night-page-deep: '#1c0708'
  night-raised: '#4a1b1b'
  night-panel: '#3d1718'
  night-panel-light: '#4d2020'
  night-ink-soft: '#f0c99a'
  stage: '#2a0b0c'
  stage-night: '#160506'
typography:
  display:
    fontFamily: 'Grandstander, Nunito, system-ui, sans-serif'
    fontSize: 'clamp(3.4rem, 9vw, 5.6rem)'
    fontWeight: 800
    lineHeight: 0.9
    letterSpacing: '-0.02em'
  headline:
    fontFamily: 'Grandstander, Nunito, system-ui, sans-serif'
    fontSize: 'clamp(2.1rem, 4.6vw, 3rem)'
    fontWeight: 800
    lineHeight: 1
  title:
    fontFamily: 'Grandstander, Nunito, system-ui, sans-serif'
    fontSize: 'clamp(1.8rem, 2.6vw, 2.4rem)'
    fontWeight: 800
    lineHeight: 1.05
  logo:
    fontFamily: 'Grandstander, Nunito, system-ui, sans-serif'
    fontSize: '1.7rem'
    fontWeight: 800
    lineHeight: 1
  body:
    fontFamily: 'Nunito, system-ui, sans-serif'
    fontSize: '1.02rem'
    fontWeight: 400
    lineHeight: 1.55
  button:
    fontFamily: 'Nunito, system-ui, sans-serif'
    fontSize: '0.95rem'
    fontWeight: 800
    lineHeight: 1.2
  label:
    fontFamily: 'Nunito, system-ui, sans-serif'
    fontSize: '0.78rem'
    fontWeight: 800
    lineHeight: 1.3
  panel-heading:
    fontFamily: 'Grandstander, Nunito, system-ui, sans-serif'
    fontSize: 'clamp(2rem, 5vw, 2.8rem)'
    fontWeight: 800
    lineHeight: 1.05
  logo-stage:
    fontFamily: 'Grandstander, Nunito, system-ui, sans-serif'
    fontSize: '1.3rem'
    fontWeight: 800
    lineHeight: 1
  lead:
    fontFamily: 'Nunito, system-ui, sans-serif'
    fontSize: 'clamp(1.02rem, 1.5vw, 1.15rem)'
    fontWeight: 600
    lineHeight: 1.55
  small:
    fontFamily: 'Nunito, system-ui, sans-serif'
    fontSize: '0.86rem'
    fontWeight: 700
    lineHeight: 1.3
  caption:
    fontFamily: 'Nunito, system-ui, sans-serif'
    fontSize: '0.74rem'
    fontWeight: 800
    lineHeight: 1.2
rounded:
  sm: '6px'
  md: '8px'
  lg: '16px'
  full: '999px'
spacing:
  row-gap: '8px'
  row-gap-phone: '6px'
  gutter: 'clamp(16px, 4vw, 48px)'
  container: '1320px'
components:
  button-primary:
    backgroundColor: '{colors.stripe-maroon}'
    textColor: '{colors.cream}'
    rounded: '{rounded.md}'
    padding: '10px 20px'
    height: '46px'
  button-paw:
    backgroundColor: '{colors.paw-pink}'
    textColor: '{colors.stripe-maroon}'
    rounded: '{rounded.md}'
    padding: '10px 20px'
    height: '46px'
  button-light:
    backgroundColor: '{colors.cream-light}'
    textColor: '{colors.stripe-maroon}'
    rounded: '{rounded.md}'
    padding: '10px 20px'
    height: '46px'
  filter-chip:
    backgroundColor: '{colors.cream-light}'
    textColor: '{colors.stripe-maroon}'
    rounded: '{rounded.md}'
    padding: '6px 10px 6px 14px'
    height: '42px'
  tag:
    backgroundColor: '{colors.fur-light}'
    textColor: '{colors.stripe-maroon}'
    rounded: '{rounded.sm}'
    padding: '4px 12px'
  badge:
    backgroundColor: '{colors.paw-pink}'
    textColor: '{colors.stripe-maroon}'
    rounded: '{rounded.sm}'
    padding: '2px 10px'
  icon-button:
    backgroundColor: '{colors.cream-light}'
    textColor: '{colors.stripe-maroon}'
    rounded: '{rounded.md}'
    size: '46px'
  nav-arrow:
    backgroundColor: '{colors.paw-pink}'
    textColor: '{colors.stripe-maroon}'
    rounded: '{rounded.md}'
    size: '52px'
  gallery-tile:
    backgroundColor: '{colors.cream}'
    rounded: '{rounded.md}'
  credits-panel:
    backgroundColor: '{colors.cream}'
    textColor: '{colors.stripe-maroon}'
    padding: '18px 26px 28px'
---

# Design System: Tigy

## Overview

**Creative North Star: "Tigy's Album"**

A photo album that wears Tigy's coat. The mechanics are those of a familiar photo library — a justified gallery that keeps every piece at its real shape, loads as you scroll, and opens into a viewer with a credits panel — and the surface is taken from Tigy: fur orange, cream from the muzzle and chest, maroon from the stripes, pink from the paw pads, and a ringed tail. The album makes the art easy to browse; the coat makes it unmistakably Tigy's.

The art always leads. Tigy's markings live on the frame — the page, the header, the dividers, the controls — and never on top of a piece. The page is light and fur-orange by day and turns to Tigy's maroon stripes at night, with the fur becoming the accent. Cute is welcome, but in small doses: a paw-print hover, paw prints while more art loads, a tail that fills as you scroll.

The site is not a card stack: content sits straight on the page, the credits panel is a flat side panel, and the only footer is a thin strip holding the privacy link.

**Key Characteristics:**

- Fur-orange page (light) and stripe-maroon page (dark), both from Tigy's own colours; visitors can pick Automatic, Light or Dark.
- One continuous justified gallery, newest first, thumbnails at each piece's real shape, no year or month sections.
- Three corner steps: 6px for small labels, 8px for almost everything, 16px for panels; only faces, the tail and the paw thumb are fully round.
- Grandstander for display, Nunito for everything you read.
- Signature markings: the forehead mark, tapered flank stripes, paw prints, the ringed tail.

## Colors

Every colour is lifted from Tigy's coat; nothing is borrowed from a generic palette.

### Primary

- **Tigy Fur** (#f5a742): the light-mode page itself, and the main accent in dark mode (stripes, primary buttons, the tail's rings).
- **Deep Fur** (#e48c2b): the "ledge" under raised controls in light mode, the tail's orange rings, scrollbar track.
- **Light Fur** (#f9c27a): tags and other quiet fills on the fur page.

### Secondary

- **Stripe Maroon** (#4b1416): text and icons in light mode, primary buttons and the stripes in light mode. On Tigy Fur it reaches 7.4:1, and 12:1 on Muzzle Cream.
- **Soft Maroon** (#6e2422): secondary text and labels in light mode, the tail's dark rings in dark mode.

### Tertiary

- **Paw Pink** (#f4a3ad): paw-pad buttons (Share, nav arrows), the NSFW badge, the avatar ring, the active NSFW switch, person dots, the hover paw prints.
- **Deep Paw Pink** (#e07c8b): the ledge under pink buttons, the NSFW confirm accents.

### Neutral

- **Muzzle Cream** (#fde3bc): panels and tile backgrounds in light mode (credits panel, gallery tile fill), and all text in dark mode.
- **Light Cream** (#fff3e0): raised light controls (filter chips, social links, theme button, NSFW switch) and the fill behind transparent stickers.
- **Night Page** (#2a0d0e) / **Night Deep** (#1c0708) / **Night Raised** (#4a1b1b): the dark-mode page, its ledges and its quiet fills.
- **Night Panel** (#3d1718) / **Night Panel Light** (#4d2020): dark-mode panels and raised controls.
- **Night Soft Ink** (#f0c99a): secondary text in dark mode.
- **Stage** (#2a0b0c, dark mode #160506): the background behind a piece on the artwork page, in both themes. Art is always judged against a calm, dark stage.

### Named Rules

**The Coat Rule.** Colours come from Tigy's markings only: fur, cream, stripe maroon, paw pink. A new colour needs a place on Tigy to come from.

**The Pink Pad Rule.** Paw Pink marks things you press and Tigy's own accents (the avatar ring, the hover paws). It is never a background for content.

**The Night Swap Rule.** Dark mode swaps roles rather than inventing colours: the page becomes stripe maroon, text becomes muzzle cream, and fur becomes the accent.

## Typography

**Display Font:** Grandstander (with Nunito, system-ui)
**Body Font:** Nunito (with system-ui)

**Character:** Grandstander is chunky and playful with soft terminals, matching the chibi art without becoming childish; Nunito is a rounded, very readable sans that carries the UI quietly.

**Alternates kept for a later swap:** Fredoka (700) and Sour Gummy (800). Both share Grandstander's soft, rounded, friendly feel and have a standard lowercase "g". They are self-hosted and declared in `src/styles.css` but unused; swapping means changing only `--font-display`, since every display style uses it. Compare them in `design/mockups/fonts.html`.

### Hierarchy

Each step is a `--text-*` variable in `src/styles.css`, named after it (`--text-display` to `--text-caption`; the stage logo is `--text-logo-stage`).

- **Display** (800, clamp(3.4rem, 9vw, 5.6rem), 0.9): the "Tigy" name in the home header, with the forehead mark before it.
- **Headline** (800, clamp(2.1rem, 4.6vw, 3rem), 1): section titles such as "All the art".
- **Panel heading** (800, clamp(2rem, 5vw, 2.8rem), 1.05): the NSFW, error and not-found panels.
- **Title** (800, clamp(1.8rem, 2.6vw, 2.4rem), 1.05): the piece's title in the credits panel.
- **Logo** (Grandstander 800, 1.7rem): the top-bar wordmark with the forehead mark; 1.3rem in the artwork page's stage bar.
- **Lead** (600, clamp(1.02rem, 1.5vw, 1.15rem), 1.55): the bio under the name.
- **Body** (400, 1.02rem, 1.55): descriptions and credits.
- **Button** (800, 0.95rem): all buttons, chips and social links.
- **Label** (800, 0.78rem): field labels in the credits panel ("Art by", "Characters") and the switch's label on small phones.
- **Small** (700, 0.86rem): the piece count, handles, tags, the file summary, toasts, tile hover labels and the full view's zoom readout.
- **Caption** (800, 0.74rem): tile badges and the tail's years.

### Named Rules

**The Two Voices Rule.** Grandstander is only for names and headings (Tigy, section titles, piece titles, tile hover labels). Anything a visitor reads or presses is Nunito.

## Layout

A single centred column, max 1320px wide, with a fluid gutter (clamp(16px, 4vw, 48px)). The home page is: top bar, an open header (avatar, name, a short bio, piece count, social links) straight on the page, a band of flank stripes, the "All the art" heading, the filter row, and the gallery.

The gallery is a justified grid: rows fill the full width, each piece keeps its own aspect ratio, and the target row height is 340px on desktop, 270px on tablets and 200px on phones, with 8px gaps (6px on phones). The layout is CSS only, so the server's first HTML already has its final rows: each tile starts at 75% of the target height and grows with its shape until the row is full, so a row is never lower than 75% of the target and on phones wide and square pieces get a row of their own. Further pages load automatically near the end of the gallery (24 at a time). The visitor's place (loaded pages and scroll) is kept for the visit, so going back from a piece returns to it; a reload starts at the top.

The artwork page is the photo viewer: a full-height dark stage with the piece centred, previous/next arrows on its sides, and a 380px credits panel on the right. At 1100px and below the panel moves under the stage; at 720px and below the arrows move to the bottom of the stage.

Breakpoints: 1100px (viewer stacks), 720px (tail timeline becomes a bottom bar, phone grid), 560px (header stacks).

## Elevation & Depth

Mostly flat, with one tactile cue. Raised controls sit on a hard "ledge": a short coloured shadow directly below them (deep fur under light controls, deep pink under pink buttons), as if they were pads you could press down. Larger surfaces use a ledge plus a soft, low drop. Gallery tiles only lift on hover. There are no glows, no glass and no layered cards.

### Shadow Vocabulary

- **Ledge** (`box-shadow: 0 2px 0 #e48c2b` or `0 3px 0 #e07c8b`): every raised control at rest; pressed controls lose most of it.
- **Lifted tile** (`box-shadow: 0 2px 0 #e48c2b, 0 16px 26px -14px rgb(0 0 0 / 0.5)`): a gallery tile on hover or focus.
- **Panel** (`box-shadow: 0 2px 0 #e48c2b, 0 18px 34px -20px rgb(75 20 22 / 0.55)`): the NSFW and not-found panels.

### Named Rules

**The Press Rule.** Only things you can press get a ledge. Text, panels at rest and the art itself stay flat.

## Shapes

Three corner steps, all gently rounded. **Small (6px):** tags, badges and labels. **Standard (8px):** gallery tiles, the piece on the artwork page, version thumbnails, buttons, dropdowns, filter chips, social links, the NSFW switch, icon buttons and viewer arrows. **Large (16px):** the NSFW and not-found panels, and the top of the filter pickers' sheet on phones.

Only a few things are fully round, because Tigy is: the avatar (Tigy's face) and the people dots next to credits, the ringed tail, and the paw thumb of the NSFW switch. The stripe dividers are tapered brush strokes, pointed at both ends.

### Named Rules

**The Three Steps Rule.** Corners are 6px, 8px or 16px; nothing in between. Full circles are reserved for faces (avatar, people dots), the tail and the paw thumb.

## Components

### Buttons

- **Shape:** gently rounded (8px), 46px tall (`--control`); the full view's buttons and the NSFW switch are 44px (`--control-small`), filter chips 42px (`--control-chip`).
- **Primary:** stripe maroon with cream text (fur with maroon text in dark mode), e.g. "Download original", which carries a paw icon.
- **Paw:** paw pink with maroon text, e.g. "Share". Pink is reserved for these.
- **Light:** light cream with maroon text, e.g. social links and "Full view".
- **Hover / Focus:** a small springy lift (2px up, 103%); on press the button sinks onto its ledge. Focus shows a 3px ink outline offset by 3px; on the dark stage and in the full view the ring is muzzle cream, since it sits outside the control.

### Chips

- **Filter row:** sticks under the top bar. It shows the four pickers, the sort chip ("Newest first" / "Oldest first", which flips the order), then "Clear all" while any filter is active. It never grows with the number of filters: a picker counts its own ("Characters · 2", "Year · 1") and takes the ink outline, and the names are inside the picker.
- **Filter pickers:** light cream, 2px soft ink outline, 8px corners, icon + label + chevron (Characters, Artists, Tags, Year), lifted while open. Each opens its choices as a 320px dropdown under the chip (8px corners, panel fill, ink outline), or as a sheet along the bottom edge on phones (16px top corners, a dimmed page behind). A choice shows a check box, the person's round dot for characters and artists, the name and its piece count; pressing it applies it at once and the picker stays open. Characters, Artists and Tags have a search field at the top. Only choices that still match the active filters are offered. While the picker is open nothing in it moves: a choice that stops matching stays in place, greyed out with 0, until the picker is opened again.
- **Tags:** light fur fill, 6px corners, "#tag" text.
- **Badges:** "NSFW" (pink) at the top-left of a tile, 6px corners. There is no GIF badge.

### Gallery tile

- **Corner Style:** 8px.
- **Background:** muzzle cream. Every piece is shown whole on it, never cropped, so stickers keep the cream behind them.
- **Hover / Focus:** lifts 5px with a slight tilt, shows the title in a cream label at the bottom, and walks three pink paw prints up the top-right corner.

### Credits panel

- **Style:** a flat, full-height cream side panel next to the stage (no card inside it), with the title in Grandstander and icon rows for artists, characters with their links, tags, the date ("Added {day}" for undated pieces) and the original file.
- **Open or closed:** the info button opens and closes it on desktop. The choice is remembered in the browser (open by default) and applied before the page paints.
- **Actions:** Download original, Share (the normal link), Full view, and for NSFW pieces "Copy safe link": the same address with `?safe`, whose link preview shows only the site card instead of the piece.
- **Phones:** the same content as a full-width cream section under the stage; the info button scrolls to it.

### Navigation

- **Top bar:** sticky, fur page colour with a slight blur; the forehead mark and "Tigy" on the left, the theme button and the "Show NSFW" switch on the right.
- **Theme button:** a 46px icon button (8px corners) cycling Automatic → Light → Dark.
- **NSFW switch:** a light cream control with 8px corners and a round paw thumb; the track turns pink when on.
- **Viewer arrows:** 52px (`--control-arrow`) paw-pink buttons with 8px corners on either side of the stage.

### Icons

- **Interface icons:** Lucide only, drawn on its 24px grid with round line ends and a slightly heavier line (2.4–2.5) to match the chunky type, shown at 18–22px in the current text colour. The Angular build uses ng-icons: a component imports the icon from `@ng-icons/lucide`, registers it with `provideIcons` and shows it with `<ng-icon name="lucideShare2" />`; the line weight is set once with `provideNgIconsConfig`.
- **Social logos:** Simple Icons (CC0), in a single colour, the button's text colour: maroon in light mode, cream in dark mode, never the networks' own brand colours and never redrawn. Shown at 18px with the handle on desktop; on phones the links become 46px logo-only buttons. Each link's accessible name is "Network: handle".
- **Tigy's own shapes** (the forehead mark, the paw print, the flank stripes) are custom filled drawings, not icons.

### Named Rules

**The One Set Rule.** Every interface icon comes from Lucide at one line weight. Social logos and Tigy's own shapes are the only exceptions.

### Signature: the tail timeline

A ringed tail on the right edge (desktop) that fills as you scroll, alternating fur and maroon rings with a dark tip. It spans the whole filtered gallery, not just the loaded pages, and marks the years only (no month bubble). Clicking or dragging to a year travels there, loading pages until that year arrives. On phones it becomes a thin ringed bar along the bottom edge. It sits beside the browser's own scrollbar rather than replacing it.

### Signature: the markings

- **Forehead mark:** one long tapered stroke crossed by two shorter ones, before the "Tigy" wordmark.
- **Flank stripes:** a band of tapered strokes entering from both page edges, between the header and the gallery.
- **Paw prints:** the gallery hover and the "loading more" indicator.

## Do's and Don'ts

### Do:

- **Do** keep thumbnails at each piece's real shape; never crop to squares.
- **Do** keep the gallery one continuous run, newest first, with no year or month headings.
- **Do** keep content straight on the page: an open header, a flat credits panel, and a footer that holds only the privacy link.
- **Do** keep the art on a calm surface: cream behind thumbnails, the dark stage behind the open piece.
- **Do** use Paw Pink only for things you press and Tigy's own accents.
- **Do** use the forehead mark (one long stroke, two crossings) as the logo mark.
- **Do** draw social logos from Simple Icons in one colour, the button's text colour.

### Don't:

- **Don't** put stripes or other markings over or behind a piece of art.
- **Don't** wrap content in cards: no card around the header, the credits or the NSFW toggle.
- **Don't** round everything: no pills, and circles only for faces, the tail and the paw thumb.
- **Don't** put anything but the privacy link in the footer; social links live in the home header.
- **Don't** replace the browser's scrollbar; the tail timeline sits beside it.
- **Don't** use Grandstander for running text or controls.
- **Don't** mix icon sets, or show social logos in their brand colours.

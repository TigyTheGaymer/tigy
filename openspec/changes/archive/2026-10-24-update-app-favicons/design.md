# Design

## Context

Both apps copy `apps/<app>/public/` into their build output, and each `index.html` links one `favicon.ico`. The public app's Express server serves those files with `maxAge: '1y'` and no hashed names. The admin app is served by Firebase Hosting with its default caching. The mark is an inline 24×24 SVG in `apps/public/src/app/markings/mark.ts` that fills with `currentColor`. The coat colours live in `apps/public/src/styles.css` (`--fur: #f5a742`, `--maroon: #4b1416`).

## Goals / Non-Goals

**Goals:**

- One source icon that both apps use unchanged.
- The mark stays legible at 16px.

**Non-Goals:**

- An icon that follows the site's light/dark toggle. Browsers don't expose the page's chosen theme to the favicon.

## Decisions

**Maroon mark on a fur square, the same in every theme.** A transparent mark in `currentColor` doesn't work: an SVG favicon has no surrounding text colour, and a maroon-only mark disappears on dark browser chrome. A filled square with a small corner radius reads on light and dark tabs alike, and the PNG and ICO can't adapt to a theme anyway. The alternative, a `prefers-color-scheme` media query inside the SVG, follows the OS rather than the site's toggle and would make the SVG differ from the PNG and ICO.

**Hand-written `favicon.svg` as the source, raster files generated once and committed.** The SVG reuses the three paths from `mark.ts`, scaled and centred inside a square with some padding, so the strokes keep their weight at 16px. A small Node script renders `apple-touch-icon.png` (180×180) and the PNG frames for `favicon.ico` (16, 32 and 48) with `sharp`, which is already a dependency. It then writes the ICO container itself, since an ICO is a short header followed by PNG frames and sharp can't write ICO. The outputs are committed, so the build gains no step or new dependency. Alternatives: an online favicon generator (not reproducible), or a build-time Nx target (more tooling for files that change rarely).

**Same files in both apps, copied rather than shared.** Each app's `public/` gets its own copy of the three files. Pointing both builds' `assets` at a shared folder would save three small files but adds config to both `project.json`s for no real gain. The script writes to both folders, so they can't drift.

**Link tags.** Each `index.html` gets:

```html
<link rel="icon" href="favicon.ico" sizes="48x48" />
<link rel="icon" href="favicon.svg" type="image/svg+xml" />
<link rel="apple-touch-icon" href="apple-touch-icon.png" />
```

Browsers that support SVG pick it. `sizes` on the ICO stops Chrome from choosing it over the SVG.

## Risks / Trade-offs

- [The public server caches `favicon.ico` for a year under the same name, so returning visitors may keep Angular's icon in that slot] → Modern browsers use the new `favicon.svg`, which has a URL they have never cached. Only clients that read `/favicon.ico` directly (old browsers, some crawlers) see the old icon until their cache expires. This is accepted rather than renaming the ICO, because `/favicon.ico` is the conventional address those clients ask for.
- [Browsers cache favicons separately from the page and can be slow to update even for new URLs] → Check in a fresh profile or private window when verifying.
- [The mark's thin strokes may blur at 16px] → Check the 16px frame by eye, and widen the padding or thicken the strokes in the favicon SVG only (not in `mark.ts`) if needed.

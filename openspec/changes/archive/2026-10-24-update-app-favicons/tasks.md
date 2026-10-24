# Tasks

Run tasks through Nx (`npx nx ...`).

## 1. Icon files

- [x] 1.1 Write `apps/public/public/favicon.svg`: a fur (`#f5a742`) square with a small corner radius and the three paths from `apps/public/src/app/markings/mark.ts` in maroon (`#4b1416`), scaled and centred with padding; verify by opening it in a browser at 16px and 180px and checking the strokes read clearly (covers "Dark browser theme")
- [x] 1.2 Add `tools/favicons.mjs`, which reads that SVG, uses `sharp` to render `apple-touch-icon.png` (180×180) and 16, 32 and 48px PNG frames, writes them into an ICO container, and writes `favicon.svg`, `favicon.ico` and `apple-touch-icon.png` into both `apps/public/public/` and `apps/admin/public/`; verify by running `node tools/favicons.mjs` and checking `file apps/*/public/favicon.ico` reports an icon with 3 images and that both apps' three files are byte-identical
- [x] 1.3 Look at the generated 16px frame and the touch icon and, if the strokes blur, adjust only the favicon SVG and rerun the script; verify by viewing the regenerated PNGs

## 2. Link tags

- [x] 2.1 In `apps/public/src/index.html` and `apps/admin/src/index.html`, replace the single icon link with the ICO (`sizes="48x48"`), SVG (`type="image/svg+xml"`) and `apple-touch-icon` links from design.md; verify with `npx nx run-many -t build -p public admin` and that `dist/apps/*/browser/` contains the three files and the built `index.html` carries the three links

## 3. Integration

- [x] 3.1 Run `npx nx run-many -t lint test build -p public admin` and confirm everything passes
- [x] 3.2 In a private window, open the running public app and the admin app, check each tab shows the new icon, and request `/favicon.ico` and `/apple-touch-icon.png` from each to check they return the new files (covers "Public tab", "Admin tab", "Browser asks for /favicon.ico" and "Adding to an iPhone home screen")

## Workflow follow-up

- Archive the change once it's verified.

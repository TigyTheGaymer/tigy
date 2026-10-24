# Tasks

Run tasks through Nx (`npx nx ...`).

## 1. Tile label

- [x] 1.1 In `apps/public/src/app/home/tiles/tile.ts`, add an optional `title` to `Tile` holding the piece's own title (undefined when it has none), and rename `alt` to `name` since it is the link's accessible name rather than an image alt (still `pieceTitle(row.title)`); update `tile.spec.ts` so a titled row carries `title` and `name`, and an untitled row has no `title` and the name "Untitled"; verify with `npx nx test public`
- [x] 1.2 In `tiles.html`, use `tile.name` for the link's `aria-label` and render `<span class="label">` only inside `@if (tile.title; as title)`; add a case to `home.spec.ts` with an untitled row whose tile has no `.label` while its link's `aria-label` is "Untitled", and keep the titled case showing its label; verify with `npx nx test public` (covers "Titled piece" and "Untitled piece")

## 2. Integration

- [x] 2.1 Run `npx nx run-many -t lint test build -p public` and confirm everything passes
- [x] 2.2 In the running public app, hover a titled and an untitled thumbnail and check only the titled one shows a label

## Workflow follow-up

- Archive the change once it's verified.

# gallery

`@tigy/gallery`: the gallery's rules as pure functions, shared by the Cloud Functions, the public server and the browser, so every part of the site applies them the same way. Nothing here talks to Firebase.

- `dates/`: partial artwork dates (`2019`, `2021-04`, `2025-11-20`), their display, and the day a piece sorts by
- `tags/`: tag normalisation
- `summaries/`: building and updating the `meta` documents, used by the Cloud Functions
- `gallery-query/`: filtering, sorting and paging the gallery rows, used by the public server
- `overview/`: piece count, date range, timeline years, filter choices and previous/next
- `gallery-params/`: a gallery query to and from its URL parameters

`shared/` holds helpers the modules use internally.

Firestore cannot combine the gallery's filters itself, so the public server filters the rows of `meta/gallery` in memory (`openspec/changes/define-data-model`, design D5). The data shapes come from `@tigy/models`.

## Running unit tests

Run `npx nx test gallery` to execute the unit tests via [Vitest](https://vitest.dev/). Test data builders are in `src/testing/` and are left out of the library build.

# models

`@tigy/models`: the shapes of the gallery's stored data, shared by the public site, the admin and the Cloud Functions. Types, constants and the Storage path helpers in `imagePaths`; no Firebase dependency.

- `person.model.ts`: `people/{personId}`, and Tigy's fixed ID
- `image.model.ts`: `images/{imageId}`, and the Storage paths of an image's files
- `meta.model.ts`: the derived `meta/gallery`, `meta/people` and `meta/tags` documents
- `firestore.model.ts`: helpers shared by the others

The data model is specified in `openspec/changes/define-data-model`. The logic that works on these shapes is in `@tigy/gallery`.

## Running unit tests

Run `npx nx test models` to execute the unit tests via [Vitest](https://vitest.dev/).

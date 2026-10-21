# uploads

`@tigy/uploads`: the upload rules shared by the admin and the Cloud Functions, so the admin refuses before uploading exactly what processing would refuse after. Nothing here talks to Firebase.

- `image-format.ts`: the supported formats, read from a file's first bytes, with each one's extension and MIME type, and the size limit

The upload record's shape comes from `@tigy/models`.

## Running unit tests

Run `npx nx test uploads` to execute the unit tests via [Vitest](https://vitest.dev/).

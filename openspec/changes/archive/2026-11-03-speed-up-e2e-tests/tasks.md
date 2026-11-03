# Tasks

Before every e2e or emulator run, check that the emulator ports (8080, 9199, 9099, 5001, 4400, 4500, 4201, 4300) are free and that no other worktree is running firebase or playwright: other checkouts use the same fixed ports.

## 1. No summary cache in public-e2e

- [x] 1.1 In `apps/public-e2e/playwright.config.mts`, default `SUMMARY_MAX_AGE_MS` to `'0'` and update its comment; verify the web server still receives it through `webServer.env`.
- [x] 1.2 In `apps/public-e2e/src/support/emulators.ts`, remove `cacheExpiry()`, its calls in `seed()` and `rebuildSummaries()`, and the `SUMMARY_MAX_AGE_MS` export; verify with `npx nx run public-e2e:lint` and a search showing nothing else uses them.
- [x] 1.3 Run `npx nx e2e public-e2e --skip-nx-cache` and verify all tests pass, noting the run time against the 114 s baseline.

## 2. Phone-only tests run only on the phone

- [x] 2.1 Retag the three tests that call `test.skip(!isMobile)` (two in `editor.spec.ts`, one in `people.spec.ts`) from `@phone` to `@phone-only`, and remove the skips and their `isMobile` parameters; verify with `npx nx run admin-e2e:lint`.
- [x] 2.2 Give the `desktop` project in `apps/admin-e2e/playwright.config.mts` `grepInvert: /@phone-only/`; verify `npx playwright test --config apps/admin-e2e/playwright.config.mts --list` shows the three only under `phone`, and the two `@phone` tests under both projects.

## 3. Sign in once

- [x] 3.1 Add `apps/admin-e2e/src/owner.setup.ts`, which signs in with `signInAsOwner` and saves `storageState({ path, indexedDB: true })` to `dist/.playwright/apps/admin-e2e/.auth/owner.json`; verify the file is written and holds the Firebase Auth IndexedDB entry for `localhost:4201`.
- [x] 3.2 In `playwright.config.mts`, add a `setup` project for that file with `retries: 2`, and make `desktop` and `phone` depend on it and load the state through `use.storageState`; verify with `--list` that the setup runs once and no spec runs under it.
- [x] 3.3 Add `openAsOwner(page, path)` to `src/support/sign-in.ts`, which goes to the page and expects the Account button without ever opening the popup, and switch every `signInAsOwner` call outside `sign-in.spec.ts` to it; verify with a search that only the setup file and `sign-in.spec.ts` call `signInAsOwner`.
- [x] 3.4 Start `sign-in.spec.ts` without a session (`test.use({ storageState: { cookies: [], origins: [] } })`); verify its four tests still pass, including "Coming back later".
- [x] 3.5 Run `npx nx e2e admin-e2e --skip-nx-cache` and verify all tests pass, the popup opens only in the setup and `sign-in.spec.ts`, and no test does a second reset.

## 4. The seed keeps its web versions

- [x] 4.1 In `firebase/seed/seed.ts`, keep the avatar and each piece's `full` and `thumb` WebP in `node_modules/.cache/tigy-seed/`, named by a hash of the source bytes, the resize and WebP settings and sharp's version, written to a temporary name and then renamed; verify with `npx nx run firebase:typecheck`.
- [x] 4.2 Verify the output is unchanged: seed into empty emulators twice, once with an empty cache and once with a full one, and compare every Storage file's MD5 and every document between the two.
- [x] 4.3 Time one seed with a full cache under `firebase emulators:exec --only firestore,storage` and verify it is about 1.8 s faster than the 2.6 s baseline.

## 5. Reset only what changed

- [x] 5.1 Check that the Storage emulator reports `md5Hash` for files the seed uploads (`bucket.getFiles()` metadata); if it doesn't, stop and choose another fingerprint before 5.2.
- [x] 5.2 After a full seed, save each Storage file's name and MD5 to `node_modules/.cache/tigy-seed/storage.json`. Before the next seed, compare them with Storage: if they match, clear Firestore and rewrite only the documents and summaries; otherwise do the full seed. A file without an MD5 counts as changed. Verify with `npx nx run firebase:typecheck`.
- [x] 5.3 Verify both paths: a seed after only adding documents leaves Storage untouched and restores the documents, and a seed after deleting a file (as `integration.spec.ts` does) restores it; compare against a full seed as in 4.2.
- [x] 5.4 Verify `npx nx run public-e2e:preview` and `npx nx run firebase:seed` still fill fresh emulators with the full seed data.

## 6. Whole-suite check

- [x] 6.1 Run `npx nx run-many -t lint -p admin-e2e public-e2e firebase` and `npx nx run firebase:typecheck`, and verify both pass.
- [x] 6.2 Time `npx nx e2e public-e2e --skip-nx-cache` and `npx nx e2e admin-e2e --skip-nx-cache`, and verify both pass and that together they are about 100 s faster than the 114 s and about 226 s baselines on runs where the popup doesn't hang. (Planned at 120 s; the trigger reload still costs every `admin-e2e` reset 4.1 s, and a full cache saves 1.45 s rather than 1.8 s.)
- [x] 6.3 Run `admin-e2e` five times in a row and verify no test outside `sign-in.spec.ts` hangs in sign-in. Record failures by test and stack in the change's notes, against the earlier 2 failed runs in 5.
- [x] 6.4 Update the functions-manifest note in `proposal.md` with whether it is worth retrying now that tests no longer open the popup; verify the note states the 6.3 result.

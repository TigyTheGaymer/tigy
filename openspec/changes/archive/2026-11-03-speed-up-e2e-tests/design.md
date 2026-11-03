# Design

## Context

Both e2e suites run one test at a time against one set of emulators, which `firebase emulators:exec` starts for each run. They share and change that data, so tests put it back with `seed()`, which runs `firebase/seed/seed.ts` in a child process. The seed clears Firestore and Storage, re-encodes the mockup images into web versions with sharp, uploads them, writes the documents and summaries, and, when the Functions emulator is running, pauses its triggers while it writes. `admin-e2e` resets after every test; `public-e2e` resets after the describe blocks that add data, and after every `integration.spec` test.

`admin-e2e` signs in at the start of every test with `signInAsOwner`, which drives the Auth emulator's Google popup. The admin keeps its session in IndexedDB, Firebase's default in a browser.

The same seed also fills the emulators for `npx nx run firebase:seed` and `public-e2e:preview`.

See proposal.md for the measurements behind each change.

## Goals / Non-Goals

**Goals:**

- Each change keeps every test's starting data the same as it is today.
- Only `sign-in.spec.ts` opens the popup; other tests fail at once if the saved session doesn't load, rather than quietly falling back to the popup.
- The seed's output stays byte for byte the same, so the preview and the manual seed don't change.

**Non-Goals:**

- Making the popup itself reliable. `sign-in.spec.ts` still uses it, with its existing retry.
- Changing how the Functions emulator reloads triggers (the manifest in proposal.md's "Not in this change").
- Changing any app, function or CI workflow.

## Decisions

### A setup project signs in, and the others start from its saved state

`apps/admin-e2e/src/owner.setup.ts` signs in with `signInAsOwner` and saves the context with `storageState({ path, indexedDB: true })`, as Playwright's docs advise for Firebase Auth. The `desktop` and `phone` projects depend on a `setup` project and load that state through `use.storageState`. The setup project gets `retries: 2`, so one hung popup costs a retry rather than the run. The setup file is outside the default test match (`*.spec.ts`), so only the setup project runs it.

The state file goes in `dist/.playwright/apps/admin-e2e/.auth/owner.json`, beside the output folder rather than in it: Playwright empties `test-output` at the start of a run. `dist` is already ignored by git.

The Auth account lives as long as the emulators, which is the whole run. The seed never clears Auth, and the emulator's tokens refresh themselves, so one sign-in lasts the run.

Alternatives: signing in once in `globalSetup`, which can't use a project's device settings or its retries; keeping the popup and adding retries, which keeps the hang and its time.

### Tests open pages with `openAsOwner`, and only `sign-in.spec.ts` keeps `signInAsOwner`

`openAsOwner(page, path)` goes to the page and expects the Account button. It never opens the popup, so a session that didn't load fails the test straight away with a clear message. `signInAsOwner` would also pass, by falling back to the popup, but that would hide the problem and bring the hangs back. `sign-in.spec.ts` starts without a session (`test.use({ storageState: { cookies: [], origins: [] } })`), because it tests signing in itself.

### Phone-only tests are tagged `@phone-only`

The three tests that call `test.skip(!isMobile)` change their title tag from `@phone` to `@phone-only` and lose the skip. The `desktop` project gets `grepInvert: /@phone-only/`, and the `phone` project's `grep: /@phone/` still matches both tags. A test skipped inside its body still runs the file's `afterEach`, which is why the skip costs a reset today; filtering it out at the project means it never starts. Tests tagged `@phone` keep running on both projects.

Alternative: a `test.skip` in a `beforeEach`. It skips the hooks' work too, but each file would need it, and the project config is where the device split already lives.

### `public-e2e` sets the summary cache to 0 ms

`playwright.config.mts` defaults `SUMMARY_MAX_AGE_MS` to `0`, and `support/emulators.ts` drops `cacheExpiry()`, so `seed()`, `addImages()` and `rebuildSummaries()` return as soon as the data is written. With `maxAgeMs` 0, `SummaryCache` reads Firestore for every page, which on the emulator costs a few milliseconds. A run with this setting passed all 133 tests. The cache itself keeps its unit tests in `summary-cache.spec.ts`.

### The seed keeps its web versions on disk, keyed by their inputs

The avatar and each piece's `full` and `thumb` web versions are kept in `node_modules/.cache/tigy-seed/`. Each is named by a hash of the source file's bytes, the resize and WebP settings, and sharp's version. A hit is read from disk; a miss is encoded and written. A changed asset or a sharp upgrade simply misses, so the cache never needs clearing. CI starts empty and fills it on its first seed.

Alternative: commit the web versions, as `firebase/seed/sample-video/` does for the video. That adds a few MB to git and needs a script to keep them in step with the assets; the cache does neither.

### The seed restores only documents when the files are unchanged

Before clearing anything, the seed lists Storage and compares each file's name and MD5 hash with a record it saved after the last full seed (`node_modules/.cache/tigy-seed/storage.json`). If they match, it clears Firestore and rewrites the documents and summaries, leaving Storage alone. Otherwise it does the full seed and saves a new record.

The decision rests on what is in Storage, not on which test ran. `integration.spec` deletes files, and `video.spec` and `artwork-fit.spec` upload some, and they still get a full reset without changing their calls. A fresh emulator run starts with empty Storage, so its first seed is always a full one, even if a record from an earlier run exists.

Alternative: a `seedDocuments()` that each spec calls when it knows it changed only documents. That is quicker to write, but a wrong choice leaves a deleted file missing for every later test, and nothing would catch it.

### The seed still runs in a child process

Running it in the test process would save about 0.5 s of Node and `@swc-node/register` start-up per reset. But the seed initialises the default Firebase app that the tests' own `support/emulators.ts` has already set up, and `firebase:seed` and the preview run it as a script. That's not worth about 15 s.

## Risks / Trade-offs

- [The Storage emulator might not report MD5 hashes] → The seed treats a file without one as changed and does a full seed. The first task checks this, before the reset is built on it.
- [A saved session goes stale during a long run] → Emulator tokens refresh themselves; if one doesn't, `openAsOwner` fails at once on the Account check and names the cause, rather than hanging.
- [The setup's popup still hangs] → That's one popup per run instead of 19, with two retries. A run fails only if all three attempts hang.
- [The cache serves a wrong file after a bad write] → Cache entries are written to a temporary name and renamed, so a crash mid-write leaves no entry. Deleting `node_modules/.cache/tigy-seed/` resets it.
- [Tests come to rely on the cache being off] → Only the 1.1 s wait goes. Caching is still the default everywhere else and keeps its unit tests.

## Migration Plan

Nothing is deployed. The suites change in the same commits as their support code, and reverting those commits puts everything back. Delete `node_modules/.cache/tigy-seed/` afterwards if wanted.

Verification is part of the tasks: timed runs of both suites, and repeated `admin-e2e` runs for the hang, each started only when the emulator ports are free (other worktrees use the same fixed ports).

## Open Questions

- Whether the functions manifest becomes safe once tests no longer open the popup. That's a separate change; this one only notes the result.

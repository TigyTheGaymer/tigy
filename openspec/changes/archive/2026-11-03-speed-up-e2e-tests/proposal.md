# Proposal

## Why

The whole suite takes about 470 s run one after another, and the two end-to-end suites are about three quarters of it. Most of that isn't testing: resetting the emulators to the seed data and waiting for the summary cache take nearly half the run, with the unit tests already fast. `admin-e2e` also fails about one run in five, always in the same place: the sign-in popup on the Auth emulator never finishes, and the test hangs until its timeout, adding three minutes or more and, in CI, blocking the deploy.

Measured on 2026-11-03, on the current main:

- An `admin-e2e` reset takes 6.7 s: 4.1 s for the Functions emulator to reload every function when the seed turns triggers back on, about 1.8 s to re-encode the same images with sharp, the rest to start Node and upload. 153 s of the suite's 210 s of test time is in after-test hooks.
- A `public-e2e` reset takes 2.6 s plus a 1.1 s wait for the summary cache to expire, mostly after tests that only added documents.
- Without any change, 2 of the last 5 `admin-e2e` runs failed in `signInAsOwner`, at its retry's `page.goto`.

## What Changes

- **Sign in once.** A setup project signs in through the popup and saves the browser state, including IndexedDB, where Firebase Auth keeps its tokens. Every other `admin-e2e` test starts signed in; only `sign-in.spec.ts` still goes through the popup. This takes the hanging popup out of 19 of the 23 tests and saves about 20 s.
- **No summary cache in `public-e2e`.** The server's summary cache is set to 0 ms for the tests, so they no longer wait 1.1 s after every data change. Saves 26 s; all 133 tests pass that way.
- **Phone-only tests run only on the phone.** The three tests that skip themselves on desktop still trigger a reset there; the desktop project stops running them. Saves about 20 s.
- **The seed reuses its encoded images.** The web versions are made once and kept, instead of re-encoded with sharp on every reset. Saves about 65 s across both suites.
- **Reset only what changed.** When a test only added or changed documents, the reset restores the documents and leaves the files. Saves about 25 s in `public-e2e`.

Together: about 470 s to about 315 s, and no more three-minute hangs from the popup. Measured afterwards: about 470 s to about 370 s, and the popup hangs only in the setup and `sign-in.spec.ts` (see notes.md).

Not in this change:

- **A pre-built functions manifest** (`functions.yaml`), which skips the 4.1 s reload and made clean `admin-e2e` runs 75 s faster. With it, the popup hang happened far more often: 7 failed tests in 6 runs, against 2 in 10 without. Every one of those failures was in the popup, so it is worth trying again once tests no longer open it. It would also need its own copy of the functions build, since `dist/apps/functions` is what gets deployed. After this change, it is worth trying again: it is now the largest saving left, at 4.1 s on each of `admin-e2e`'s 20 resets. The regular tests no longer open the popup and never hung in five runs. The popup still hung twice in 25 openings, in the setup and in `sign-in.spec.ts`, so a retry should compare how often those two hang with and without the manifest.
- **Running e2e tests in parallel.** Once resets are cheap, `public-e2e` has about 30 s of browser work left, and parallel runs would need isolated data per test.
- **Caching Nx results between CI runs.** It would help reruns after a failed deploy, but deploys would then build from the cache; that needs its own decision.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. Only how the tests run changes; the site's and the admin's behavior stays the same, so `skip_specs` is set.

## Impact

- `apps/admin-e2e/`: `playwright.config.mts` (a setup project, its saved state, phone-only tests out of the desktop project), `src/support/sign-in.ts`, and the specs that sign in.
- `apps/public-e2e/`: `playwright.config.mts` (summary cache), `src/support/emulators.ts` (the lighter reset, no cache wait).
- `firebase/seed/seed.ts`, for kept web versions and a documents-only reset; the seed's output stays the same.
- The saved sign-in state is a test artifact under `dist/`, never committed.
- No change to the apps, the functions, the data or CI's workflow files.

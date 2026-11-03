# Notes

Results of the whole-suite check (tasks 6.2 and 6.3), measured on 2026-11-03.

## Run times

| Suite | Before | After, popup didn't hang |
| --- | --- | --- |
| `public-e2e` | 114 s, 133 tests | 66 s, 133 tests |
| `admin-e2e` | 214–235 s, 23 tests (3 more skipped) | 177–182 s, 23 tests plus the setup |

Playwright's own times, without the build or the emulators' start. `npx nx e2e public-e2e` took 79 s in all and `npx nx e2e admin-e2e` 260 s, the latter with one retried setup.

In `public-e2e`, 10 of 14 resets were documents only; in `admin-e2e`, 15 of 20. Every reset path ended identical to a full seed (task 5.3).

## Sign-in hangs in five `admin-e2e` runs

| Run | Time | Result |
| --- | --- | --- |
| 1 | 182 s | All passed |
| 2 | 177 s | All passed |
| 3 | 179 s | All passed |
| 4 | 240 s | Passed. The setup's first attempt timed out at `sign-in.ts:22` (the popup) > `sign-in.ts:52` > `owner.setup.ts:6`; its retry passed. |
| 5 | 239 s | **Failed**: "Stranger signs in: only the owner can sign in" timed out at `sign-in.spec.ts:15`, in the popup. |

None of the 95 test runs that open pages with the saved session hung. The popup itself still hangs about once in 12 times it opens (2 in 25 here). It now opens only in the setup, which retries, and in `sign-in.spec.ts`, which doesn't. Runs still fail about as often as before (1 in 5, against 2 in 5), but only through `sign-in.spec.ts`. A failure costs 60 s rather than three minutes or more.

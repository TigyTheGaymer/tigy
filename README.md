# tigy

A gallery for Tigy's art commissions: a public site (`apps/public`, Angular SSR) and a private admin (`apps/admin`, Angular SPA), backed by Firebase (`apps/functions`, `firebase/`). Shared types live in `libs/models`.

## Prerequisites

- Node.js 22 or later, with npm
- Java 21 or later (the Firestore and Storage emulators run on Java)

The Firebase CLI is a dev dependency, so no global install is needed.

## Install

```bash
npm ci
```

## Projects

| Project     | Path             | Tag        | What it is                                                      |
| ----------- | ---------------- | ---------- | --------------------------------------------------------------- |
| `public`    | `apps/public`    | `frontend` | Public gallery, Angular with server-side rendering              |
| `admin`     | `apps/admin`     | `frontend` | Owner-only admin, Angular single-page app                       |
| `functions` | `apps/functions` | `backend`  | Cloud Functions (`europe-west6`)                                |
| `firebase`  | `firebase`       | `backend`  | `firebase.json`, Firestore and Storage rules, Firestore indexes |
| `models`    | `libs/models`    |            | Types shared by all three apps, imported as `@tigy/models`      |

## Run locally

Start the Emulator Suite (Auth, Firestore, Storage, Functions). This builds the functions first, then serves the Emulator UI at http://127.0.0.1:4000. Stop it with Ctrl+C.

```bash
npx nx run firebase:emulators
```

The emulators use the `demo-tigy` project ID, so they never touch the real Firebase project.

The Functions emulator reloads when `dist/apps/functions` changes. To pick up code changes while it runs, rebuild on save in another terminal:

```bash
npx nx build functions --watch
```

In a second terminal, start the public site at http://localhost:4200:

```bash
npx nx serve public
```

And the admin at http://localhost:4201:

```bash
npx nx serve admin
```

## Build, lint and test

```bash
npx nx run-many -t lint test build
```

Or one project at a time, for example:

```bash
npx nx build public
```

## Deploy

Everything lives in one Firebase project, `tigy-165cc`. Every push to `main` runs [.github/workflows/deploy.yml](.github/workflows/deploy.yml), which deploys only what changed since the last successful run:

1. **Gate**: `nx affected -t lint test build`. If anything fails, nothing deploys.
2. **Stage 1, backend** (`tag:backend`): `firebase` deploys the Firestore rules and indexes and the Storage rules; `functions` deploys the Cloud Functions.
3. **Stage 2, frontends** (`tag:frontend`): `admin` deploys to Firebase Hosting (https://tigy-165cc.web.app); `public` creates an App Hosting rollout of the pushed commit (https://public--tigy-165cc.europe-west4.hosted.app).

| You change                        | What deploys           |
| --------------------------------- | ---------------------- |
| `firebase/*` or `firebase.json`   | rules and indexes      |
| `apps/functions`                  | functions              |
| `apps/admin`                      | admin                  |
| `apps/public`                     | public site            |
| `libs/models`                     | every app using it     |
| a dependency in `package.json`    | every project using it |
| `nx.json` or `tsconfig.base.json` | everything             |

Backend always deploys before frontends, so a page never ships before the rules or indexes it needs. Newly added composite indexes can take a few minutes to build, so a new query can briefly fail right after a deploy.

Each stage deploys the affected projects that do not carry the other stage's tag, so every project with a `deploy` target must be tagged `backend` or `frontend`.

The workflow is the only thing that ships the public site: App Hosting's own automatic rollouts are off. Only one deploy runs at a time; a newer push waits. A failed run is retried by the next push, because the next run compares against the last successful one.

The workflow signs in to Google Cloud with Workload Identity Federation (pool `github`, provider `tigy-repo`, service account `github-deploy`), so no key is stored in GitHub.

`github-deploy` holds only the roles the deploys need. A deploy that fails with HTTP 403 usually names the missing permission; grant the narrowest role that has it, on the narrowest resource, and add it here.

The first deploy of a function with a new kind of trigger (the first Firestore trigger, for example) grants roles to Google's own service accounts, which only the owner may do. Deploy that one by hand with `npx nx run functions:deploy` before pushing; CI handles later updates.

| Role                                       | Granted on                                                                        | Needed for                                                        |
| ------------------------------------------ | --------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `roles/firebaserules.admin`                | project                                                                           | Firestore and Storage rules                                       |
| `roles/datastore.indexAdmin`               | project                                                                           | Firestore indexes and field overrides                             |
| `roles/firebasestorage.viewer`             | project                                                                           | finding the default Storage bucket before releasing its rules     |
| `roles/storage.bucketViewer`               | bucket `tigy-165cc.appspot.com`                                                   | reading that bucket's metadata (no access to its files)           |
| `roles/cloudfunctions.admin`               | project                                                                           | Cloud Functions                                                   |
| `roles/iam.serviceAccountUser`             | service account `tigy-165cc@appspot.gserviceaccount.com`                          | the functions deploy's permission check, which tests this account |
| `roles/iam.serviceAccountUser`             | service account `418667371179-compute@developer.gserviceaccount.com`              | deploying functions, which run as it                              |
| `roles/artifactregistry.reader`            | project                                                                           | Cloud Functions images                                            |
| `roles/firebasehosting.admin`              | project                                                                           | the admin on Firebase Hosting                                     |
| `roles/firebaseapphosting.admin`           | project                                                                           | public site rollouts on App Hosting                               |
| `roles/developerconnect.readTokenAccessor` | project                                                                           | App Hosting reading the commit through the GitHub connection      |
| `roles/iam.serviceAccountUser`             | service account `firebase-app-hosting-compute@tigy-165cc.iam.gserviceaccount.com` | starting App Hosting builds, which run as it                      |
| `roles/serviceusage.serviceUsageConsumer`  | project                                                                           | checking that the needed APIs are enabled                         |

Changing only the `hosting` section of `firebase.json` marks the `firebase` project, not `admin`. Deploy the admin by hand afterwards (see below).

### Deploy by hand

Signed in with `npx firebase login`, each project deploys on its own:

```bash
npx nx run firebase:deploy
```

```bash
npx nx run functions:deploy
```

```bash
npx nx run admin:deploy
```

The public site builds on App Hosting from a commit that is already pushed to GitHub:

```bash
npx nx run public:deploy --commit=$(git rev-parse HEAD)
```

### Roll back

- **Public site**: roll out an earlier commit. App Hosting rebuilds it, which takes a few minutes; the command returns when the build is ready, and traffic moves to it about a minute later. The next push that touches `apps/public` ships the latest code again.

  ```bash
  npx nx run public:deploy --commit=<earlier-sha>
  ```

- **Admin**: in the Firebase console, open Hosting > Release history and choose Rollback on an earlier release.
- **Rules, indexes and functions**: revert the commit on `main` and push. The workflow redeploys the earlier version.

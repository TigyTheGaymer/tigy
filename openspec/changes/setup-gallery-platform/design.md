# Design

## Context

See proposal.md for motivation and scope. Before this change the repo had no app code: no Nx workspace, no Angular apps, no Firebase project. It is on GitHub (`TigyTheGaymer/tigy`), and commits go directly to `main`.

The gallery's decisions were settled in two passes:
- **Product decisions (#1-#11)**, carried over from the owner's earlier `decisions.md` (2026-10-14). Each feature change restates the ones it builds on.
- **Architecture decisions (A1-A14)**, settled in an explore session (2026-10-14/15). This change holds the platform decisions (A8, A10, A11, A12). The others live in the feature change that implements them: A1, A2, A13 in `add-image-upload`; A3, A4, A5, A14 in `add-public-gallery`; A6, A7 in `add-artists`. A9 was superseded by A13 and dropped.

There is a single owner, who is the only admin and the only developer. Visitors are worldwide. Expected traffic is personal-gallery scale (hundreds to low thousands of visits a month), which keeps every service close to or within its free usage.

## Goals / Non-Goals

**Goals:**
- Security rules are the single access gate. No public path to drafts depends on UI code behaving correctly.
- Every public page is one Firestore query with no follow-up lookups.
- The image files the public sees are produced by one backend pipeline, never directly by the browser.
- Every push to `main` deploys exactly what changed, in a safe order, with no manual steps.
- The bill stays at cents per month at the expected traffic, and alerts fire before a spike becomes expensive.

**Non-Goals:**
- Visual design, layout, and browsing controls (sort/filter UI, infinite scroll vs. "load more"). These belong to a separate UI/UX change.
- Multiple admins, roles, or custom claims.
- App Check, a custom domain, video commissions, and scheduled backups.
- A separate hosted dev/staging environment.

## Decisions

### System overview

```
  visitors (worldwide)
      |
      v
  Cloud CDN --miss--> App Hosting: apps/public (Angular SSR)   [NL europe-west4]
                          |   pages, plus /img/{id}/{v}/{name} for web versions (A14)
                          | firestore/lite, anonymous (rules apply);
                          | /img misses fetch the file via its token URL
                          v
  owner --> Hosting: apps/admin (SPA) --> Firestore / Storage   [CH europe-west6]
            Google sign-in                      ^        |
                                                |        v
                                       apps/functions (sharp)  [CH europe-west6]

  libs/models: shared Image / Artist types for all three apps
  firebase (Nx project): firestore.rules, storage.rules, firestore.indexes.json
```

### A8 - Regions: Zurich for data and functions, Netherlands for App Hosting

Firestore, Storage and Functions are in `europe-west6` (Zurich). App Hosting is in `europe-west4` (Netherlands), the only European App Hosting region. The Firestore location is permanent.

- *Why:* the owner wants the data in Switzerland. The SSR server only crosses regions on a CDN cache miss.
- *Alternatives:* `us-central1` for everything (Storage free tier and 100 GB/month free egress; $0 at this scale); `europe-west4` for everything (one region, Tier 1 function pricing).
- *Trade-off:* Storage has no free tier outside `us-east1`, `us-west1` and `us-central1`, and Zurich functions are Tier 2. At the expected traffic this comes to roughly $0.20-$2 a month, mostly visitor downloads.

### A10 - One Firebase project plus the local Emulator Suite

Everyday development runs against the emulators (Firestore, Storage, Functions, Auth), including rules tests. Spikes run in the real project before launch, while nothing is public.

- *Alternatives:* separate dev and prod projects (twice the setup, billing and config for a single developer).

### A11 - Every push to `main` deploys what changed, through one GitHub workflow

```
push to main
  -> nx-set-shas            base = last commit that deployed successfully
  -> nx affected -t lint test build      (nothing deploys if this fails)
  -> stage 1  tag:backend   firebase  (rules + indexes), functions
  -> stage 2  tag:frontend  admin  -> firebase deploy --only hosting
                            public -> firebase apphosting:rollouts:create --git-commit $SHA
```

- App Hosting's own automatic rollouts are **off**, so the workflow is the only thing that ships the public site. Backend always deploys before frontends.
- The order comes from two tag-based stages, not Nx dependencies. Making `public` depend on `firebase` would mark it affected on every rules change and trigger pointless rollouts.
- Rules and indexes form their own Nx project (`firebase`), so `affected` sees changes to them.
- A workflow `concurrency` group keeps two deploys from overlapping.
- Auth uses Workload Identity Federation (no service-account key stored in GitHub). The deploy service account only gets the roles it needs.
- App Hosting setup: root directory `apps/public`; the Angular application builder; the lock file committed; Node 22 or later.
- *Alternatives:* App Hosting auto-rollout alongside a workflow for the rest (two triggers, and the public site could ship before its rules or indexes); manual deploys from the laptop.

### A12 - No App Check at launch

App Check conflicts with A3 (an anonymous SSR server has no browser to produce a token) and with A2 (`<img>` token URLs can't send an App Check header). Abuse is limited instead by:

- Firestore rules allowing public list queries only with `request.query.limit <= 24` (added in `add-public-gallery`).
- Budget alerts at a few thresholds.
- A known path to add App Check later, which would mean reworking A3.

## Risks / Trade-offs

- [The Firebase CLI might not work with keyless auth in GitHub Actions] → spike S3 passed; no fallback needed.
- [The current Angular/Nx versions may be newer than what App Hosting officially supports] → spike S4 passed; no pinning needed.
- [Master downloads (5-20 MB each) are the most attractive target for bill abuse] → budget alerts (A12). A billing kill switch remains a drastic last resort.
- [Newly deployed composite indexes take minutes to build; a public rollout right after can briefly fail new queries] → rare (only when a new query shape is added) and fixes itself.
- [Artifact Registry keeps every App Hosting build and function image; only 0.5 GB is free] → cleanup policies. App Hosting sets its own on `firebaseapphosting-images` (keeps the latest build, deletes the rest after 30 minutes), so an App Hosting rollback rebuilds from the earlier commit. Function images in `europe-west6` are deleted after 1 day (`firebase functions:artifacts:setpolicy`).
- [The workflow runs from the start, so unfinished features reach the live but unadvertised `*.hosted.app` and `*.web.app` addresses before launch] → accepted. Rules deny everything until each feature change lands its own, and drafts are never public.

## Migration Plan

This is a new system, so there is nothing to migrate. Rollout order:

1. Create the Firebase project on the Blaze plan with Firestore, Storage and Functions in `europe-west6`, and set budget alerts.
2. Scaffold the Nx workspace and the `firebase` project, and set up the emulators.
3. Run spikes S1-S5 in the real project while it is still empty and private:
   - S1: token URLs work while Storage rules deny all reads.
   - S2: whether Storage downloads are edge-cached for faraway visitors.
   - S3: the Firebase CLI deploys from GitHub Actions with keyless auth.
   - S4: a current Angular + Nx SSR app builds and runs on App Hosting with root directory `apps/public`.
   - S5: metadata stripping without re-encoding works on real artist files (JPEG, PNG, GIF, APNG).
4. Turn on the GitHub workflow. Set App Hosting automatic rollouts to off. From then on every feature change ships through it.
5. Build the features as separate changes, each landing its own rules, indexes, functions and admin/public screens with their tests: `add-image-upload`, `add-public-gallery`, `add-nsfw-handling`, `add-artists`. Archive them in that order, since later ones add to specs the earlier ones create.

**Rollback:** App Hosting can roll out an earlier commit. Hosting keeps release history. Functions and rules roll back by redeploying an earlier commit through the workflow.

**Setup checklist:**
- Artifact Registry cleanup policy (keep the last few builds).
- Budget alerts (e.g. $5 / $20 / $50).
- App Hosting automatic rollouts off; root directory `apps/public`.
- Google sign-in as the only Auth provider; the owner's UID in the rules.
- Workload Identity Federation and the deploy service account.

## Spike results

Run in `tigy-165cc` (default bucket `tigy-165cc.appspot.com`).

- **S4 - current Angular + Nx on App Hosting: passed, no pinning needed.** The owner created backend `public` (`europe-west4`, root directory `apps/public`, live branch `main`, automatic rollouts off). The scaffolded app (Angular 22.1, Nx 23.2, application builder) built and runs on the `nodejs24` runtime. `https://public--tigy-165cc.europe-west4.hosted.app/` returns server-rendered HTML (`ng-server-context="ssr"`, `ng-version="22.1.8"`) through Google's CDN (`via: 1.1 google`).
- **S1 - token URLs with deny-all Storage rules: passed, A2 stands.** With the placeholder rules (`allow read, write: if false`) deployed, a temporary function uploaded a test JPEG and called the Admin SDK's `getDownloadURL()`, then was deleted. The token URL returns 200 with the exact uploaded bytes and the `Cache-Control` set on upload (`public, max-age=31536000, immutable`). The same URL without the token, with a wrong token, the object's metadata URL, and the public `storage.googleapis.com` path all return 403. The fallback (public-read rules on `images/**`) is not needed.
- **S2 - edge caching of token URLs: not edge-cached.** Temporary probe functions in `us-central1`, `asia-northeast1` and `australia-southeast1` each fetched the S1 token URL (625 KB JPEG, `immutable`) six times, with a same-size file from cdnjs as a control. Every Storage response came from Google's storage front end (`Server: UploadServer`) with no `Age` or `Via` header, and repeats were no faster: time to first byte 0.7-1.9 s from the US and 2.7-4.4 s from Tokyo and Sydney (about 0.3 s from Switzerland). The control was served from cache (`Age` present) in 18-70 ms everywhere. Browser caching (1-year `immutable`) still helps repeat visits. Fallback adopted (owner, 2026-10-16): web versions are served through the App Hosting CDN, see A14 in `add-public-gallery`.
- **S3 - keyless deploy from GitHub Actions: passed.** Workload identity pool `github` with OIDC provider `tigy-repo` (accepts only `TigyTheGaymer/tigy` on `refs/heads/main`), and service account `github-deploy` that the repo may impersonate (`roles/iam.workloadIdentityUser`), holding only `roles/firebaserules.admin` and `roles/serviceusage.serviceUsageConsumer`. The workflow `.github/workflows/s3-spike.yml` (`google-github-actions/auth@v2`, then `npx firebase deploy --only firestore:rules`) succeeded on push to `main` with no key stored in GitHub. The Firebase CLI picks up the federated credentials as Application Default Credentials. Task 4.2 adds the roles for functions, Hosting and App Hosting deploys. When granting roles to a freshly created service account, the first grant can fail with "does not exist" for a few seconds; retry it.
- **S5 - metadata stripping without re-encoding: passed.** A small parser per format (JPEG, PNG/APNG, GIF, WebP) copies the file block by block and drops only whole metadata blocks, so every byte that carries pixels, colour or animation is unchanged. Verified on synthetic fixtures with GPS, camera data, XMP, P3 profiles, a rotated JPEG, an animated GIF, an APNG and still and animated WebP, and on four real artist files (JPEG, PNG, WebP with an ICC profile, and a 24-frame animated GIF): pixels identical for every frame (sharp, plus upng for APNG frames), frame delays and loop count kept, ICC profile byte-identical, no EXIF/XMP/IPTC left apart from the orientation (checked with exifr and sharp), and stripping a second time changes nothing. The real files carried almost no metadata (one JPEG comment), as drawing-app exports usually do, so GPS/camera removal and APNG are covered by the synthetic fixtures only. The per-format rules are recorded in `add-image-upload`'s design (A13), which moves the stripper into `apps/functions`.

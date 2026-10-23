# Design

## Context

See proposal.md for why this change exists. What is already in place:

- **No cookies, nothing from other sites.** The live site sends no `Set-Cookie` on pages, the sitemap or static files. Fonts are served from `/fonts/`, images from `/img/` and avatars from `/avatars/`; social links are plain `<a>` links. The browser loads no Firebase SDK: the server reads Firestore and Storage with `firebase-admin`.
- **Browser storage** goes through `LOCAL_STORAGE` and `SESSION_STORAGE` in `apps/public/src/app/shared/storage.ts`. Five values use it: the theme, the closed credits panel and the NSFW switch (local, until changed), and the gallery address and the confirmed NSFW pieces (session).
- **Hosting.** The public site runs on App Hosting (Cloud Run behind Google's CDN) in `europe-west4`. Cloud Run writes a request log entry per request (IP address, user agent, referrer, URL, status, time) to Cloud Logging's `_Default` bucket, whose default retention is 30 days and whose location is `global` unless set otherwise. The server adds only its startup line and errors.
- **Pages.** Routes are `''`, `i/:id` and `**`. The server route `**` renders every address with `CDN_CACHE_CONTROL`. `HeadService.siteCard()` sets the site card, and the title is always "Tigy". The home page has the top bar and a hero header with the social links. The artwork and not-found pages are full-height stages with the stage bar. Neither has a footer today.

## Goals / Non-Goals

**Goals:**

- The privacy page is true on the day it ships: its claims about cookies and other sites are checked by a test, and its facts about the hosting are checked once by hand.
- No new runtime configuration or deploy step.

**Non-Goals:**

- Changing Google's logging: retention, location and exclusions stay as they are. The page describes them.
- Checking with a test that the stored values match the page's list: there are five, they change rarely, and the page is updated by hand with them.
- Translating the page, or a legal review beyond the Swiss rules in the proposal.

## Decisions

### V1. The contact lives in the page source

The operator's name, country and contact address are written into the privacy page's template. The page shows them to everyone, so they are public by nature. The page names the operator "Tigy", in Switzerland, with the address `tigythegaymer@hotmail.com`, both chosen by the owner. It must never be `OWNER_EMAIL`, which is the owner's Google account and stays a secret.

Alternatives: an App Hosting environment variable (needs an `apphosting.yaml` or console setting the repo doesn't have yet, and a placeholder for the emulators, for a value that is public anyway), or a field on Tigy's person in Firestore (editable from the admin, but it ties the privacy page to the catalog, the data model and the rules). Keeping it in the source also makes replacing the address a one-line change.

### V2. A static, lazy page at `/privacy`

`app/privacy/privacy.ts` holds `PrivacyPage`, with its template in `privacy.html` if it runs over 25 lines. A lazy route `privacy` sits before `**`. It needs no data. It calls `HeadService.siteCard()`, so the title stays "Tigy" and link previews show the site card. The existing `**` server route already gives it the 5-minute shared cache. The page stays out of the sitemap, whose requirement lists only the home and artwork pages.

The text describes the stored values in general terms, in two groups by how long they last, without naming NSFW, and shows a "Last updated" date.

### V3. Hosting facts are checked once, by hand

Before the page ships, the owner checks the facts it states, in the console or with read-only `gcloud` commands:

- the `_Default` bucket's retention and location (Logging → Logs Storage, or `gcloud logging buckets describe _Default --location=global --project tigy-165cc`);
- what one request entry for the public backend holds, in Logs Explorer.

The owner reports the bucket is on its defaults: 30-day retention, `global` location. The page states the retention, what an entry holds, and that Google keeps it as the host. A `global` bucket can be stored outside Switzerland, including in the US, under Google Cloud's data processing terms. The page says so, as FADP Art. 19(4) asks for data kept abroad.

### V4. One footer in the app shell

`SiteFooter` (`app/chrome/site-footer.ts`, inline template) is a thin stage-coloured `<footer>` with a single "Privacy" link. It sits in `app.html` after the router outlet, so every page gets exactly one, including the not-found view the artwork page renders for a missing piece. On the home page it follows the gallery, so it shows only once every piece has loaded; the owner chose this over a second link in the header. `public-gallery` and `DESIGN.md` change from "no footer" to "only the privacy footer", which still never repeats the social links.

Alternatives: a link inside each page (the home header, the credits panel and the not-found panel; tried first, but the owner preferred one place), or a footer in each page component (duplicates the footer when the artwork page shows its not-found view).

### V5. One walk test

`apps/public-e2e/src/privacy.spec.ts` walks the home page, turns the NSFW switch on, and opens an artwork page, the not-found page and `/privacy`. It records every request and asserts that each one goes to the base URL's origin. It asserts that no response carries `set-cookie` and that `context.cookies()` is empty. A new third-party script, embed or cookie then fails CI before it ships. The page and its links get component tests beside them.

## Risks / Trade-offs

- [On the home page the footer waits for the whole gallery] → Accepted by the owner. The gallery is a few hundred pieces, and artwork and not-found pages show the footer at once.
- [Google changes a default, or someone changes the bucket's retention or location] → The page's hosting facts go stale without a failing test. Mitigation: the "Last updated" date, and rechecking V3 whenever logging settings change.
- [A public address attracts spam] → Accepted. The address can be filtered or replaced, and V1 keeps that a one-line change.
- [A future feature adds analytics, an embed or App Check] → It would need consent from EU visitors and a page update. Mitigation: the walk test fails on the first outside request or cookie.

## Migration Plan

Ships with a normal push to `main`: no data, rules or configuration change. Rollback is a revert. The owner's input from V1 and V3 must be in place before the change is merged, so the page never ships with placeholder text.

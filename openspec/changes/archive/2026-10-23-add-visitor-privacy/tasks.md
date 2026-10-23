# Tasks

Run tasks through Nx (`npx nx ...`). The public site's pages get component tests beside them.

## 1. Owner input

- [x] 1.1 The page names the operator "Tigy" with the contact `tigythegaymer@hotmail.com` (design V1); the owner confirms the address differs from the `OWNER_EMAIL` secret
- [x] 1.2 Check the hosting facts the page states (design V3): the owner reports the `_Default` bucket is on its defaults, 30-day retention and `global` location; a request entry holds the IP address, browser, referrer, address asked for, status and time

## 2. Links to the privacy page

- [x] 2.1 Add `SiteFooter` in `app/chrome/site-footer.ts` with a single "Privacy" link to `/privacy`, placed after the router outlet in `app.html` (design V4); verify with a component test that the app ends with it, and the design e2e test that the home, artwork, not-found and privacy pages each have exactly one footer with only that link, covering the "Every page links to the privacy page" scenarios
- [x] 2.2 Change the no-footer rule in `DESIGN.md` to allow only the privacy footer, and remove any other Privacy link; verify by reading `DESIGN.md` and by the design e2e test, covering "No footer" (`public-gallery`)

## 3. Privacy page

- [x] 3.1 Add `PrivacyPage` in `app/privacy/privacy.ts` and the lazy `privacy` route before `**`, calling `HeadService.siteCard()` (design V2); verify with a component test that the title is "Tigy" and the site card is set, and an e2e spec that `/privacy` answers 200 with the site card, covering "Privacy page" (`public-pages`) and "Link to the privacy page"
- [x] 3.2 Write the page's text from 1.1 and 1.2: the operator, country (Switzerland) and contact; no cookies, analytics, tracking or content from other sites; what one request entry holds, that Google keeps it as the host, where and for how long; the stored values in general terms (display settings until changed, gallery position and chosen pieces until the tab closes); how to refuse or clear them in the browser; and a "Last updated" date (design V2, V3); verify with a component test that the contact link, the log retention and both storage durations appear, without the word NSFW, covering "Reading the privacy page"

## 4. Holding the site to the page

- [x] 4.1 Add the walk in `apps/public-e2e/src/privacy.spec.ts`: home, NSFW switch on, an artwork page, the not-found page and `/privacy`, recording every request and response (design V5); verify with `npx nx e2e public-e2e` that every request is on the base URL's origin, no response has `set-cookie` and `context.cookies()` is empty, covering "Browsing the site" and "Social links"
- [x] 4.2 Run `npx nx affected -t lint test build e2e` and verify it passes

## Workflow follow-up

- Archive the change after review, which syncs `visitor-privacy` and the `public-pages` changes into the main specs.

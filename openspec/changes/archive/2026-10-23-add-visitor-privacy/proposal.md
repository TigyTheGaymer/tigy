# Proposal

## Why

The site is run from Switzerland, and two Swiss rules apply to it even though the app itself keeps nothing about visitors. The Data Protection Act (FADP, Art. 19) asks whoever collects personal data to say who they are, how to reach them and what is kept: App Hosting's request logs keep every visitor's IP address and browser. The Telecommunications Act (Art. 45c) allows storing data in a visitor's browser only when visitors are told what is stored, why, and that they can refuse: the site keeps the theme, the NSFW switch and three other values there. Neither rule asks for consent, so the site needs no cookie banner, but it does need a short privacy page.

## What Changes

- **Privacy page.** A new `/privacy` page says:
  - who runs the site, in which country, and how to reach them;
  - that the site sets no cookies and uses no analytics, tracking or content from other sites;
  - what the hosting records about each request (IP address, browser, address asked for, time), that Google keeps it as the host, where and for how long;
  - in general terms, what is kept in the browser, what for, how long it lasts, and that the visitor can refuse or clear it in the browser's settings.
- **A privacy footer.** Every page ends with a small footer holding only the "Privacy" link. This relaxes the no-footer rule in `public-gallery` and `DESIGN.md`: the footer still never repeats the social links. On the home page it follows the gallery, so it shows once every piece has loaded.
- **One test** that walks the site and fails on a cookie or a request to another site, so the page stays true.

Out of scope: age assurance for NSFW pieces; changing where or how long Google keeps the logs; the admin, which only the owner uses.

## Capabilities

### New Capabilities

- `visitor-privacy`: what the public site tells visitors about what it keeps: no cookies or content from other sites, and the privacy page with the links to it.

### Modified Capabilities

- `public-gallery`: the no-footer rule allows a footer that holds only the privacy link.

- `public-pages`: the public addresses gain `/privacy`, and the privacy page carries only the site card in link previews, like the home and not-found pages.

## Impact

- `apps/public`: a lazy `/privacy` route and page, and a footer component in the app shell, so every page gets it once.
- `apps/public/DESIGN.md`: the no-footer rule allows the privacy footer.
- `apps/public-e2e`: tests for the privacy page, the links to it, and cookies and outside requests.
- **Owner input:** the name the page shows and a public contact address, and a check of the project's log retention and location in Google Cloud, which the page states.
- No new dependencies, data, rules or deploy steps.

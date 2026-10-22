# social

`@tigy/social`: the social networks the site has logos for, shared by the public site (which draws the logos) and the admin (which suggests the networks and reads profile addresses). Nothing here talks to Firebase.

- `brands.ts`: each network's logo and profile address; `brandFor()` finds a network however it is written, and `profileFromUrl()` reads the network and handle from a profile address

## Running unit tests

Run `npx nx test social` to execute the unit tests via [Vitest](https://vitest.dev/).

# Proposal

## Why

Uploads now become artworks, but every new artwork stays unpublished with no title, credits or tags, and the only way to change that is the Firebase console. People exist only in the emulator seed, so real credits and Tigy's social links can't be entered either. `add-image-upload` left all editing to this change; with it, the owner runs the whole site from the admin.

## What Changes

- **Artworks page.** A list of every artwork, newest first by sort date, with its thumbnail, title (or "Untitled"), date and its published and NSFW state, and a "No artist" hint on pieces that credit no artist. It filters by unpublished, published SFW and published NSFW, has a Needs work view of pieces with no artist, title or date, searches by title, and shows the three counts that `gallery-catalog` asks for. It becomes the admin's landing page in place of Uploads.
- **Uploading from the Artworks page.** An Upload button, and files dropped anywhere on the page, go through the same checks and uploads as the Uploads page. Files still uploading or processing, and failed ones, show as tiles at the top whatever the view or search; a finished file becomes its artwork's tile. The Uploads page stays as the full log.
- **Artwork editor.** One page per artwork: the full image and file details, title, description, a partial date (year, month, day), artists and characters in order, tags with suggestions, published and NSFW switches. Edits are saved together with a Save button, and leaving with unsaved edits asks first. Previous and next walk the list the owner came from, and Save and next saves and moves on, with keyboard shortcuts for saving and moving. A credited person's name, links and avatar can be edited in a side panel without leaving the artwork. A published piece links to its public page.
- **Credits.** Artists and characters are picked from the people by name, reordered, and removed. Typing a name no one has offers to create that person and credit them at once.
- **Bulk actions.** Several artworks can be selected in the list to publish, unpublish, mark or unmark NSFW, or delete together. Publishing asks first when some of them credit no artist, but never refuses. Titles, credits and tags stay single-artwork edits.
- **Deleting an artwork.** From the editor or the list, with a confirmation. Its files go (already done by the image trigger), and now its upload record does too.
- **People page.** A list of everyone with their avatar, name and how many artworks credit them; Tigy comes first and is marked as the site's own person. A person editor sets the name, the ordered social links (network, handle, address) and the avatar. Pasting a Bluesky, Telegram, Twitter/X or Fur Affinity profile address fills in the network and handle. Deleting a person goes through the existing `deletePerson` callable, which refuses while any artwork credits them and names those artworks; Tigy can be renamed but not deleted.
- **Avatars.** The owner picks an image, drags and zooms (or pinches) a square crop, and the admin uploads a 512-pixel WebP made in the browser. Re-encoding drops every bit of metadata. The avatar can also be removed. Deleting a person removes their avatar file.
- **Phones.** The admin is designed for a desktop and works on a phone: pages reflow, the editor stacks the image above the form, the Upload button opens the photo picker, and the cropper takes touch.
- **Shared network list.** The social networks the site has logos for, with how to read a handle from each one's profile address, move from the public site into a shared library that both apps use.
- **Uploads.** A ready row opens its artwork in the editor.
- **Rules.** Browsers may no longer create artworks: they come only from processing. Updates to artworks and writes to people are limited to the editable fields with the right types, so a slip in the admin can't overwrite a piece's file details or creation time.
- **Summaries under load.** The image and person triggers retry on failure, so a bulk action whose triggers contend on `meta/gallery` still ends with every row right. The account menu gains "Rebuild summaries", the recovery path from `define-data-model` D4, which until now could only be called by hand.
- **End-to-end tests of the admin** against the emulators, including sign-in, an upload through to a published, credited artwork, bulk actions and the people flows, at a desktop and a phone width. Like the public site's, they run in CI and must pass before a deploy.

Out of scope: renaming or merging tags (deferred in `define-data-model` D4), replacing an artwork's file, linking a clean and an NSFW version of a piece, bulk edits of credits and tags, cropping avatars out of an existing artwork, and previewing an unpublished piece on the public site.

## Capabilities

### New Capabilities

- `artwork-editing`: the admin's Artworks page and artwork editor: listing, filtering and counting artworks, editing an artwork's details, credits, tags, publishing and NSFW state, bulk actions, and deleting.
- `people-editing`: the admin's People page and person editor: creating people (also from a credit picker), names, social links, avatars, and deleting people.

### Modified Capabilities

- `admin-access`: the admin opens the Artworks page after sign-in and for unknown addresses, instead of the Uploads page.
- `image-upload`: files can also be uploaded from the Artworks page; a ready upload row opens its artwork; artworks can no longer be created from a browser.

`gallery-catalog` keeps its requirements: this change builds the admin side of what it already asks for (tag suggestions, refusing to delete credited people, the owner's counts, deleting an artwork, editing Tigy's links).

## Impact

- **Code:** `apps/admin` (Artworks and People pages with uploading on Artworks, artwork and person editors, credit and tag pickers, avatar cropper, bulk actions, navigation in the top bar, the unsaved-edits guard, the upload row's link, phone layouts); more spartan-ng helm components in `libs/admin-ui`; a new `libs/social` with the network list moved from `apps/public`, which now imports it; `apps/functions` (retries on the image and person triggers, the image trigger deleting the upload record, the person trigger deleting the avatar); `firebase/` (Firestore and Storage rules with their tests); a new `apps/admin-e2e` Playwright project.
- **Dependencies:** none new expected; the cropper is built on the canvas API. `@playwright/test` is already in the workspace.
- **Firebase:** a functions and rules deploy. No console steps.
- **Other changes:** builds on `define-data-model` (fields, `deletePerson`, `rebuildSummaries`) and `add-image-upload` (admin shell, Uploads page).

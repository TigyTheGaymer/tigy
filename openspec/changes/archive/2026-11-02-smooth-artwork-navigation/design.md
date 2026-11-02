# Design

## Context

See proposal.md for why, and the `public-pages` delta for the behaviour. The apps are on Angular `~22.1.0`, with signals throughout, `httpResource` for reads and server rendering with hydration.

`ArtworkPage` is reused between `/i/:id` routes, so its host, `main` and stage already survive a move. What goes is everything behind `@if (data())`, and `data()` empties on a move because `latest()` keeps a value only while `previous.artwork.id === id()`. Measured on the preview at 1440×900:

- removed on a move: the image, both arrows, three toolbar buttons and `.info-wrap`, plus the credits panel's style tags;
- the credits column turns from the panel colour to the stage colour, and the Show NSFW switch shifts sideways;
- the API takes about 50 ms locally, so the gap is far longer on a real connection.

When a move starts, the page knows only the new ID and the neighbour's title (`NeighbourLink`). The NSFW flag, image or video, dimensions, credits and the next neighbours all come with the response. With the switch off, `neighbours()` already leaves NSFW rows out, but the page has to stay safe for any ID.

The server waits for the data before rendering, so a waiting state must never reach the first HTML, and hydration needs the browser's first render to match the server's.

## Goals / Non-Goals

**Goals:**

- One always-present page, with `isMissing()` as its only full swap.
- Instant moves to pieces visited since the page was opened.
- No NSFW file requested before its data allows it.
- State derived with signals, and no new `effect()` or timers.

**Non-Goals:**

- Preloading neighbours' images or data. Visited pieces cover going back and forth, and this can follow if forward moves still feel slow.
- View transitions and router resolvers. Transitions run on route change, before the data arrives, and resolvers go against the `httpResource` convention.
- `NgOptimizedImage`, which the public app doesn't use. This change keeps the current plain `<img>`.
- Changing the API, its cache headers or the first HTML.
- Skeletons on the home page or anywhere else.

## Decisions

### The piece on screen is `data()`, not `id()`

`id()` becomes only "what was asked for". The details, `share()` and `copySafeLink()` come from `data()`, which may be a remembered piece. Everything that loads a file comes from `answered()`, the last piece the server answered with: `fullImage`, `video`, `originalHref`, `isVideo` and `isImageShown`. A remembered flag may be stale, so going back shows the details at once and holds the old image until the refresh answers. This is the NSFW guarantee. With `fullImageUrl(this.id())` as it is now, keeping the old piece would point a shown `<img>` at the new piece's file before its flag is known.

`isMoving` is a `computed`: `!!data() && data().artwork.id !== id()`.

### `data()` is derived from `resource.snapshot`

A new `shownPiece(resource, request)` in `artwork/shown-piece.ts` returns the signal. It is a `linkedSignal` whose source is `{ snapshot: resource.snapshot(), request: request() }`, and whose computation is a pure function of that source and the previous state:

```ts
interface ShownState {
  piece?: ArtworkResponse;
  visited: ReadonlyMap<string, ArtworkResponse>; // by ID and includeNsfw
}
```

| `snapshot.status` | `piece` | `visited` |
| --- | --- | --- |
| `resolved`, `reloading` with a value | the value | adds it |
| `loading` | visited entry for this request, else the previous piece | unchanged |
| `error`, 404 | none | removes this request's entry |
| `error`, other | the previous piece if it has this ID, else none | unchanged |
| `idle` | none | unchanged |

Why this shape:

- `snapshot` is public API since 22.0 and gives status, value and error as one value, with no `hasValue()` guards and no risk of `value()` throwing.
- `linkedSignal` is the only signal primitive that sees its previous value, which this needs. The project's `latest()` already uses it that way, and nothing ever calls `.set()` on this one.
- Returning a new `Map` keeps the computation free of side effects, so no `effect()` has to copy state, which the Angular guidance forbids. `isMissing` and `hasFailed` keep working unchanged, since `data()` empties on those errors.
- `httpResource` still runs on every move, so visited pieces refresh in the background and the 10-minute freshness rule holds. The app's server-response reuse is untouched.

`latest()` loses its `keep` option, which nothing uses any more, and stays for the home page.

Alternatives:

- A root `VisitedPiecesService` written from an effect, which was this design's first version. Rejected: it uses an effect to propagate state, and it reads a non-reactive `Map` from a computation. The cost of dropping it is that what's remembered lasts only as long as the page instance, so returning from the gallery starts fresh. Going back and forth, which is the complaint, isn't affected.
- `resourceFromSnapshots`, the framework's way to compose resources. Rejected for now because it is marked experimental, and this page needs only a value, not a whole `Resource`.
- An HTTP interceptor cache, which would hide the refresh and reach every endpoint; or the browser cache, which `max-age=0` rules out.

### The template has no loading gates

The outer `@if (isMissing())` stays, since a missing piece is another page and owes a 404. Inside it, these always render: `main`, the stage bar and its controls, and the `app-credits-panel`. The `@if`s that stay are about content or which piece kind to draw: the arrows at the ends of the gallery, image / player / confirm / error in the stage, and optional rows in the panel.

`CreditsPanel.page` becomes an optional `input<ArtworkResponse>()`, with its computed values allowing for no page, and a new `isWaiting` input for a move. Existing `@for` blocks already track by stable IDs, so an unchanged person or tag keeps its element.

Everything the template binds comes from a `computed`, such as `previousLink()`, so no logic is added to the template.

### Toolbar slots are always filled

- Share, download and full view render on every piece and are disabled when the piece isn't shown or there's no data yet. The download `<a>` has no `href` then, so nothing of the piece leaks and it is no longer a link.
- For a video, a `.round` spacer with `aria-hidden` takes full view's slot. Using a spacer rather than a hidden button keeps "videos have no full view" true for the existing tests.
- The info toggle is always enabled, because the credits panel is always there. On the confirm screen this is new, and harmless, since the details already show.
- At 420 px and below the stage bar's controls shrink to 40 px with no gaps. The bar already overflowed by 21 px at 375 px on images, and fixed slots would spread that to videos, the confirm screen and loading states.

### The same `<img>` changes `src`, and a `linkedSignal` tracks the wait

Keep the element and let the browser swap it: the HTML standard keeps the current image displayed while the new one loads, and it avoids a duplicate request from a preload object.

```ts
protected readonly imageSrc = computed(() =>
  isShownImage ? fullImageUrl(data().artwork.id) : undefined);

protected readonly isImageWaiting = linkedSignal<string | undefined, boolean>({
  source: this.imageSrc,
  computation: (src) =>
    !!src && this.isPastLanding(),
});
```

`(load)` and `(error)` set it to `false`, which is the case `linkedSignal` is meant for: derived state that an event can override, and that resets when its source changes.

`isPastLanding` starts from `inject(Router).navigated`, read once when the page is constructed, and turns true once the shown piece changes. The router sets that flag at the end of the first navigation, so it is `false` on the server and while hydrating, and `true` when arriving from the gallery. Only the piece the visitor landed on is exempt, so moving from a landed video to an image still waits. That keeps the waiting state out of the first HTML and out of the hydrating render, and it avoids a real trap: a server-rendered image can finish loading before hydration attaches `(load)`, and `withEventReplay` doesn't replay it, so the wait would never end.

Every later `<img>` is safe, because Angular attaches listeners when it creates the element and sets `src` afterwards, so `load` fires even for a cached file. No `img.complete` check is needed.

Check in a real browser that `width`/`height` changing ahead of the pixels doesn't stretch the old image; `.piece img` has `width: auto; height: auto`, so the natural size should hold.

Alternative: preload with `new Image()` and `decode()`, then set `src`. That guarantees no half-painted frame, but needs a second state and matters less with the skeleton delay. Revisit it if the browser check fails.

### CSS holds the skeleton delay, with no timer

A small `Skeleton` component in `artwork/skeleton/skeleton.ts` draws the placeholder. It renders as soon as a part is waiting, and when `isDelayed` is on, a CSS `animation-delay` keeps it invisible for the first 300 ms. If the wait ends sooner, `@if` removes it unseen.

This replaces a `setTimeout` signal, which would need an effect, cleanup and care around the server. Angular's guidance prefers native CSS for this, and plain keyframes on insertion are what the project already uses (`drop-in`, `step-up`). Shimmer is off under `prefers-reduced-motion`; the 300 ms delay stays, since it only controls when a static block appears.

Conditions, all `computed`:

- stage: waiting when there is no data and no failure, or `isMoving()`, or `isImageWaiting()`;
- credits: waiting when there is no data and no failure, or `isMoving()`.

`isDelayed` is decided when a wait starts, as a `linkedSignal` on the waiting flag that reads `data()` with `untracked`: true if there was a piece to hold, false if not. Deriving it continuously would restart the animation when data arrives partway through. The skeleton overlays the held content with an opaque background, and the arrows and stage bar sit above it. `aria-busy` goes on the stage and panel while they wait.

### Arrows stay as links and point at the pending piece

While `isMoving()`, both arrows' `routerLink` target the current `id()`. With the router's default `onSameUrlNavigation: 'ignore'`, which this app doesn't change, a press does nothing, and the `<a>` keeps its `href`, so focus stays. They also get `aria-disabled` while moving, and `go()` returns early for keys and swipes.

Alternative: `[routerLink]="null"` while moving. Rejected, because a link without `href` loses focus.

### DOM side effects use `afterRenderEffect` with phases

`afterRenderEffect` is the right tool for imperative DOM work and never runs on the server. The new work only writes, so it uses the `write` phase rather than the catch-all:

- **Video:** when `id()` changes, pause the current player right away. When the shown piece changes, a reused player gets `muted = true` and plays. It only pauses on `id()`, because calling `stopVideo` there would clear the source Angular has just bound if the next piece's data is already remembered. Leaving a video for an image or leaving the page still goes through `stopVideo`, as now. `[muted]="true"` is a constant binding and won't reset a player the visitor unmuted, which is why it needs setting by hand.
- **Credits scroll:** when the shown piece changes, set `.info-wrap`'s `scrollTop` to 0, through a `viewChild` rather than a new DOM lookup. The window's scroll is already handled by `withInMemoryScrolling`.

## Angular conventions this keeps to

| Convention | Here |
| --- | --- |
| `httpResource` for reads, no `fetch()`, `.subscribe()` or `rxResource` | `CatalogService.artwork()` is unchanged |
| Route parameters as `input()`s | `id` and `safe` are unchanged |
| `computed` and `linkedSignal` for state; `effect` only for outside systems | No new `effect()`; every new value is derived |
| `afterRenderEffect` for DOM work, split by phase | Video and scroll use `write` |
| Native CSS over `@angular/animations` | Skeleton delay and shimmer are CSS |
| Signal inputs and outputs, `viewChild` | `CreditsPanel` and the scroll reset |
| Feature folders, no suffix on components, boolean prefixes | `artwork/shown-piece.ts`, `artwork/skeleton/skeleton.ts`, `isMoving`, `isImageWaiting`, `isDelayed` |

## Risks / Trade-offs

- [`resource.snapshot` and the request must describe the same moment] → They are read together in one reactive source, and a resource's status changes as soon as its params do. A test covers a move on the first tick.
- [The new piece's title sits beside the old image while the image loads] → Accepted: on a slow load the stage skeleton replaces the old image at 300 ms, and the gap is short otherwise.
- [A skeleton shows only briefly when a load finishes just after 300 ms] → Accepted: it only affects loads that are already noticeably slow.
- [A quick second press is dropped while waiting] → Accepted over skipping a piece. Going back and forth over visited pieces has no wait, so no presses are dropped there.
- [Going back over a visited piece shows old details for a moment] → Accepted: the refresh replaces them, and this is the same data the visitor just saw.
- [`Router.navigated` is plain state, not a signal] → It is read once at construction, which is all this needs. Unit and e2e tests cover both a direct load and arriving from the gallery.
- [Existing tests assert things that this removes, such as no toolbar controls on the confirm screen] → Update those tests to the new behaviour and keep the sound and NSFW checks.

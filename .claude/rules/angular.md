# Angular conventions

The apps (`apps/public`, `apps/admin`) are on Angular 22. Follow these when writing or changing Angular code.

## Services

- A singleton service uses `@Service()` from `@angular/core`, which provides it in the root injector. Never use `@Injectable({ providedIn: 'root' })`.
- A service that is provided by hand (in a `providers` list, or under another token with `useClass`) uses `@Service({ autoProvided: false })`. Never use a bare `@Injectable()` for it.
- Get dependencies with `inject()`, not constructor parameters.

```ts
import { inject, Service } from '@angular/core';
import { Meta } from '@angular/platform-browser';

@Service()
export class HeadService {
  private readonly meta = inject(Meta);
}
```

## Signals first

Use signals wherever Angular offers them, and RxJS only where an Angular API requires it (such as an `HttpBackend` returning an `Observable`).

- Load server data with `httpResource()`, not `HttpClient` calls returning Observables, `rxResource` or `.subscribe()`. `httpResource` goes through `HttpClient`, so the browser still reuses the server's responses while it hydrates. Don't call `fetch()` directly in the app: that skips the reuse and server rendering's wait for data.
- A service that reads data returns resources from methods that take signal functions, such as `catalog.gallery(() => request)`, and returns `undefined` from the function to keep a resource idle.
- Read route parameters and query parameters as component `input()`s (the router binds them with `withComponentInputBinding()`), not with `ActivatedRoute` and `toSignal`.
- Derive state with `computed()` and `linkedSignal()`. Use `effect()` only for side effects outside Angular, such as writing to browser storage.

## File and class names

- A service's class ends in `Service` and lives in its own `<name>.service.ts`, with its tests in `<name>.service.spec.ts`: `NsfwSwitchService` in `nsfw-switch.service.ts`. One service per file.
- Components take no suffix: `HomePage` in `home.ts`, with `home.html`, `home.css` and `home.spec.ts` beside it.

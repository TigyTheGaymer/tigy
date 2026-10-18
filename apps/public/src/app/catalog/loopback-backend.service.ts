import {
  FetchBackend,
  HttpBackend,
  HttpParams,
  type HttpEvent,
  type HttpRequest,
} from '@angular/common/http';
import {
  DOCUMENT,
  inject,
  Service,
  REQUEST_CONTEXT,
  type Provider,
} from '@angular/core';
import type { Observable } from 'rxjs';

/** Passed by `server.ts` as each render's request context. */
export interface RenderContext {
  apiOrigin: string;
}

/** Sends the page's own `/api/` requests to this server, so rendering skips the CDN. */
export function loopbackUrl(
  url: string,
  pageOrigin: string,
  apiOrigin: string,
): string {
  const parsed = new URL(url, pageOrigin);
  if (parsed.origin !== pageOrigin || !parsed.pathname.startsWith('/api/')) {
    return url;
  }
  return apiOrigin + parsed.pathname + parsed.search;
}

// A backend, not an interceptor: interceptors run before the transfer cache,
// which would then store responses under a URL the browser never requests.
@Service({ autoProvided: false })
export class LoopbackBackendService implements HttpBackend {
  private readonly fetch = inject(FetchBackend);
  private readonly pageOrigin = inject(DOCUMENT).location.origin;
  private readonly apiOrigin =
    (inject(REQUEST_CONTEXT, { optional: true }) as RenderContext | null)
      ?.apiOrigin ?? null;

  handle(req: HttpRequest<unknown>): Observable<HttpEvent<unknown>> {
    if (!this.apiOrigin) return this.fetch.handle(req);
    const url = loopbackUrl(req.urlWithParams, this.pageOrigin, this.apiOrigin);
    return this.fetch.handle(
      url === req.urlWithParams
        ? req
        : req.clone({ url, params: new HttpParams() }),
    );
  }
}

export function provideLoopback(): Provider {
  return { provide: HttpBackend, useClass: LoopbackBackendService };
}

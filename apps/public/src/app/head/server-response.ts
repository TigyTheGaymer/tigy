import { inject, RESPONSE_INIT } from '@angular/core';

/** Sets the status of the server-rendered response; does nothing in the browser. */
export function injectServerResponse() {
  const response = inject(RESPONSE_INIT, { optional: true });
  return {
    notFound(): void {
      if (response) response.status = 404;
    },
    /** Not cached, so a passing failure doesn't stay at the CDN. */
    unavailable(): void {
      if (!response) return;
      const headers = new Headers(response.headers);
      headers.set('Cache-Control', 'no-store');
      response.status = 503;
      response.headers = headers;
    },
  };
}

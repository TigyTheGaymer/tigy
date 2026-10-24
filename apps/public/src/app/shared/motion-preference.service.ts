import { DestroyRef, DOCUMENT, inject, Service, signal } from '@angular/core';

interface NetworkInformation {
  saveData?: boolean;
}

/** False on the server, which can't know. */
@Service()
export class MotionPreferenceService {
  private readonly view = inject(DOCUMENT).defaultView;
  private readonly motionQuery = this.view?.matchMedia?.(
    '(prefers-reduced-motion: reduce)',
  );

  readonly isMotionReduced = signal(this.motionQuery?.matches ?? false);
  readonly isDataSaved = signal(
    (this.view?.navigator as { connection?: NetworkInformation } | undefined)
      ?.connection?.saveData === true,
  );

  constructor() {
    const query = this.motionQuery;
    if (!query?.addEventListener) return;
    const update = (event: MediaQueryListEvent) =>
      this.isMotionReduced.set(event.matches);
    query.addEventListener('change', update);
    inject(DestroyRef).onDestroy(() =>
      query.removeEventListener('change', update),
    );
  }
}

import { DOCUMENT, effect, inject } from '@angular/core';

/**
 * Makes the browser ask before the page is closed or reloaded while `isOn()`
 * is true. Call it in an injection context. Phones don't always show the
 * question, so navigation inside the admin needs its own guard.
 */
export function warnBeforeLeaving(isOn: () => boolean): void {
  const view = inject(DOCUMENT).defaultView;
  effect((onCleanup) => {
    if (!view || !isOn()) return;
    // The browser shows its own "Leave site?" dialog.
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    view.addEventListener('beforeunload', warn);
    onCleanup(() => view.removeEventListener('beforeunload', warn));
  });
}

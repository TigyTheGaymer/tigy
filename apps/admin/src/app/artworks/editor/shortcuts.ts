import { DOCUMENT, inject, InjectionToken } from '@angular/core';

export const IS_MAC = new InjectionToken<boolean>('IS_MAC', {
  factory: () => {
    const navigator = inject(DOCUMENT).defaultView?.navigator;
    return /Mac|iPhone|iPad/.test(
      navigator?.platform ?? navigator?.userAgent ?? '',
    );
  },
});

export type Shortcut = 'save' | 'save-and-next' | 'previous' | 'next';

/** Which editor shortcut a key press is, if any. Ctrl and ⌘ both count, on any system. */
export function shortcutOf(event: KeyboardEvent): Shortcut | undefined {
  const isCommand = event.ctrlKey || event.metaKey;
  if (isCommand && !event.altKey && event.key.toLowerCase() === 's') {
    return 'save';
  }
  if (isCommand && event.key === 'Enter') return 'save-and-next';
  if (event.altKey && !isCommand && !event.shiftKey) {
    if (event.key === 'ArrowLeft') return 'previous';
    if (event.key === 'ArrowRight') return 'next';
  }
  return undefined;
}

/** Text boxes use Alt+arrows to move through words on some systems. */
export function isTextBox(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target instanceof HTMLTextAreaElement || target.isContentEditable) {
    return true;
  }
  return (
    target instanceof HTMLInputElement &&
    !['checkbox', 'radio', 'button', 'submit', 'file'].includes(target.type)
  );
}

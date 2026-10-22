import {
  computed,
  DestroyRef,
  DOCUMENT,
  effect,
  inject,
  Service,
  signal,
} from '@angular/core';

export type ThemeChoice = 'system' | 'light' | 'dark';

/** The same key as the script in index.html, which applies it before the app starts. */
export const THEME_KEY = 'tigy-admin-theme';

/** Light, dark, or the device's own setting, remembered in this browser. */
@Service()
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly media = this.document.defaultView?.matchMedia?.(
    '(prefers-color-scheme: dark)',
  );
  private readonly isDeviceDark = signal(this.media?.matches ?? false);

  readonly choice = signal<ThemeChoice>(this.stored());
  readonly theme = computed(() => {
    const choice = this.choice();
    if (choice !== 'system') return choice;
    return this.isDeviceDark() ? 'dark' : 'light';
  });

  constructor() {
    const follow = (event: MediaQueryListEvent) =>
      this.isDeviceDark.set(event.matches);
    this.media?.addEventListener('change', follow);
    inject(DestroyRef).onDestroy(() =>
      this.media?.removeEventListener('change', follow),
    );
    effect(() => {
      this.document.documentElement.dataset['theme'] = this.theme();
    });
  }

  choose(choice: ThemeChoice): void {
    this.choice.set(choice);
    try {
      if (choice === 'system') localStorage.removeItem(THEME_KEY);
      else localStorage.setItem(THEME_KEY, choice);
    } catch {
      // Storage can be blocked; the choice then lasts until the page closes.
    }
  }

  private stored(): ThemeChoice {
    try {
      const value = localStorage.getItem(THEME_KEY);
      return value === 'light' || value === 'dark' ? value : 'system';
    } catch {
      return 'system';
    }
  }
}

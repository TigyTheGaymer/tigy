import { DOCUMENT, inject, Service } from '@angular/core';
import { LOCAL_STORAGE, storedSignal } from '../shared/storage';

export type Theme = 'auto' | 'light' | 'dark';

const ORDER: readonly Theme[] = ['auto', 'light', 'dark'];

/** index.html applies the stored theme before first paint; the button shows it once hydrated. */
@Service()
export class ThemeService {
  private readonly root = inject(DOCUMENT).documentElement;
  private readonly stored = storedSignal<Theme>(LOCAL_STORAGE, 'tigy.theme', {
    initial: 'auto',
    parse: (value) => (value === 'light' || value === 'dark' ? value : 'auto'),
    serialize: (theme) => (theme === 'auto' ? null : theme),
  });
  readonly theme = this.stored.value;

  cycle(): void {
    this.set(nextTheme(this.theme()));
  }

  set(theme: Theme): void {
    this.stored.set(theme);
    if (theme === 'auto') delete this.root.dataset['theme'];
    else this.root.dataset['theme'] = theme;
  }
}

export function nextTheme(theme: Theme): Theme {
  return ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length];
}

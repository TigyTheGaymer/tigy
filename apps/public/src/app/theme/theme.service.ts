import {
  afterNextRender,
  DOCUMENT,
  inject,
  Service,
  signal,
  type Signal,
} from '@angular/core';
import { local } from '../browser/storage';

export type Theme = 'auto' | 'light' | 'dark';

const KEY = 'tigy.theme';
const ORDER: readonly Theme[] = ['auto', 'light', 'dark'];

/**
 * Index.html applies the stored theme before first paint; the server renders
 * "auto", so the button only shows the stored choice once hydrated.
 */
@Service()
export class ThemeService {
  private readonly root = inject(DOCUMENT).documentElement;
  private readonly state = signal<Theme>('auto');
  readonly theme: Signal<Theme> = this.state.asReadonly();

  constructor() {
    afterNextRender(() => this.state.set(stored(local.get(KEY))));
  }

  /** Automatic → Light → Dark → Automatic. */
  cycle(): void {
    this.set(nextTheme(this.state()));
  }

  set(theme: Theme): void {
    this.state.set(theme);
    if (theme === 'auto') {
      delete this.root.dataset['theme'];
      local.remove(KEY);
    } else {
      this.root.dataset['theme'] = theme;
      local.set(KEY, theme);
    }
  }
}

export function nextTheme(theme: Theme): Theme {
  return ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length];
}

function stored(value: string | null): Theme {
  return value === 'light' || value === 'dark' ? value : 'auto';
}

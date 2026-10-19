import { Component, computed, inject } from '@angular/core';
import { LucideMonitor, LucideMoon, LucideSun } from '@lucide/angular';
import { nextTheme, ThemeService, type Theme } from './theme.service';

const NAMES: Record<Theme, string> = {
  auto: 'Automatic (follows your device)',
  light: 'Light',
  dark: 'Dark',
};

@Component({
  selector: 'app-theme-button',
  imports: [LucideMonitor, LucideMoon, LucideSun],
  template: `
    <button
      type="button"
      class="round theme-btn"
      [attr.aria-label]="label()"
      [title]="'Theme: ' + name()"
      (click)="themes.cycle()"
    >
      @switch (themes.theme()) {
        @case ('light') {
          <svg lucideSun class="icon" aria-hidden="true"></svg>
        }
        @case ('dark') {
          <svg lucideMoon class="icon" aria-hidden="true"></svg>
        }
        @default {
          <svg lucideMonitor class="icon" aria-hidden="true"></svg>
        }
      }
    </button>
  `,
})
export class ThemeButton {
  protected readonly themes = inject(ThemeService);
  protected readonly name = computed(() => NAMES[this.themes.theme()]);
  protected readonly label = computed(
    () =>
      `Theme: ${this.name()}. Switch to ${NAMES[nextTheme(this.themes.theme())].toLowerCase()}`,
  );
}

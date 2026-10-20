import { Component, computed, inject } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideMonitor, lucideMoon, lucideSun } from '@ng-icons/lucide';
import { nextTheme, ThemeService, type Theme } from './theme.service';

const NAMES: Record<Theme, string> = {
  auto: 'Automatic (follows your device)',
  light: 'Light',
  dark: 'Dark',
};

@Component({
  selector: 'app-theme-button',
  imports: [NgIcon],
  providers: [provideIcons({ lucideMonitor, lucideMoon, lucideSun })],
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
          <ng-icon name="lucideSun" class="icon" />
        }
        @case ('dark') {
          <ng-icon name="lucideMoon" class="icon" />
        }
        @default {
          <ng-icon name="lucideMonitor" class="icon" />
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

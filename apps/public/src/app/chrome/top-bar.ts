import {
  afterNextRender,
  Component,
  DestroyRef,
  ElementRef,
  inject,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Mark } from '../markings/mark';
import { NsfwSwitch } from '../nsfw/nsfw-switch';
import { ThemeButton } from '../theme/theme-button';

@Component({
  selector: 'app-top-bar',
  imports: [RouterLink, Mark, NsfwSwitch, ThemeButton],
  template: `
    <header class="topbar">
      <a class="logo" routerLink="/"><app-mark />Tigy</a>
      <div class="topbar-right">
        <app-theme-button />
        <app-nsfw-switch />
      </div>
    </header>
  `,
})
export class TopBar {
  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const destroyRef = inject(DestroyRef);
    // The filter row and the timeline sit right under the bar, whatever its height on this screen.
    afterNextRender(() => {
      const bar = host.querySelector('.topbar');
      if (!bar || typeof ResizeObserver === 'undefined') return;
      const observer = new ResizeObserver(() =>
        document.documentElement.style.setProperty(
          '--bar-h',
          `${bar.getBoundingClientRect().height}px`,
        ),
      );
      observer.observe(bar);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }
}

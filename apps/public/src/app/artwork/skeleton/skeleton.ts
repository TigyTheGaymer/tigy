import { Component, input } from '@angular/core';

/** Invisible for its first 300 ms when delayed, so a shorter wait never shows it. */
@Component({
  selector: 'app-skeleton',
  host: { 'aria-hidden': 'true', '[class.is-delayed]': 'isDelayed()' },
  template: `
    @if (kind() === 'details') {
      <span class="bar title"></span>
      <span class="bar"></span>
      <span class="bar short"></span>
      <span class="bar"></span>
      <span class="bar short"></span>
    } @else {
      <span class="bar block"></span>
    }
  `,
  styleUrl: './skeleton.css',
})
export class Skeleton {
  readonly kind = input<'stage' | 'details'>('stage');
  readonly isDelayed = input(false);
}

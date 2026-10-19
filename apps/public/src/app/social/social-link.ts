import { Component, computed, input } from '@angular/core';
import { LucideLink } from '@lucide/angular';
import type { SocialLink as Link } from '@tigy/models';
import { brandFor } from './brands';

/**
 * A social link: the network's logo (or a generic link icon) and the handle,
 * named "Network: handle" for screen readers. As a button, phones show the
 * icon only.
 */
@Component({
  selector: 'app-social-link',
  imports: [LucideLink],
  styleUrl: './social-link.css',
  template: `
    <a
      [class]="look() === 'button' ? 'pad light social' : 'social-inline'"
      [href]="link().url"
      rel="noopener"
      [attr.aria-label]="name() + ': ' + link().handle"
      [title]="name()"
    >
      @if (brand(); as brand) {
        <svg class="logo" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path [attr.d]="brand.path" />
        </svg>
      } @else {
        <svg lucideLink class="logo generic" aria-hidden="true"></svg>
      }
      <span class="handle">{{ link().handle }}</span>
    </a>
  `,
})
export class SocialLink {
  readonly link = input.required<Link>();
  readonly look = input<'button' | 'inline'>('button');

  protected readonly brand = computed(() => brandFor(this.link().network));
  protected readonly name = computed(
    () => this.brand()?.name ?? capitalise(this.link().network),
  );
}

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

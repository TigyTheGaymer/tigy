import { Component, computed, input } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideLink } from '@ng-icons/lucide';
import type { SocialLink as Link } from '@tigy/models';
import { brandFor } from '@tigy/social';

@Component({
  selector: 'app-social-link',
  imports: [NgIcon],
  providers: [provideIcons({ lucideLink })],
  styleUrl: './social-link.css',
  template: `
    <a
      [class]="look() === 'button' ? 'pad light social' : 'social-inline'"
      [href]="link().url"
      [attr.aria-label]="name() + ': ' + link().handle"
      [title]="name()"
    >
      @if (brand(); as brand) {
        <svg
          class="logo"
          viewBox="0 0 24 24"
          aria-hidden="true"
          focusable="false"
        >
          <path [attr.d]="brand.path" />
        </svg>
      } @else {
        <ng-icon name="lucideLink" class="generic" />
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

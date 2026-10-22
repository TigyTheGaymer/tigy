import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft } from '@ng-icons/lucide';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';

/**
 * Every page's title row, the same height on each, so moving between pages
 * doesn't shift what is below it. Put a subtitle in `[pageSubtitle]`, and
 * actions in the content.
 */
@Component({
  selector: 'app-page-header',
  imports: [HlmButtonImports, HlmSkeletonImports, NgIcon, RouterLink],
  providers: [provideIcons({ lucideArrowLeft })],
  templateUrl: './page-header.html',
})
export class PageHeader {
  /** Undefined while loading: a placeholder keeps the row's height. */
  readonly heading = input<string>();
  readonly back = input<string>();
  readonly backParams = input<Record<string, string | null>>({});
  readonly backLabel = input('Back');
}

import { Component } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideTriangleAlert } from '@ng-icons/lucide';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';

/** Something the owner should fix before publishing, such as "No artist". */
@Component({
  selector: 'app-warning-badge',
  imports: [HlmBadgeImports, NgIcon],
  providers: [provideIcons({ lucideTriangleAlert })],
  template: `
    <span
      hlmBadge
      variant="outline"
      class="gap-1 border-amber-500/50 bg-amber-500/15 text-amber-800 dark:text-amber-300"
    >
      <ng-icon name="lucideTriangleAlert" aria-hidden="true" />
      <ng-content />
    </span>
  `,
})
export class WarningBadge {}

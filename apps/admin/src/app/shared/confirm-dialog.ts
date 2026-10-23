import { Component, inject } from '@angular/core';
import { BrnDialogRef, injectBrnDialogContext } from '@spartan-ng/brain/dialog';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import type { Answer, Confirmation } from './confirm.service';

@Component({
  selector: 'app-confirm-dialog',
  imports: [HlmButtonImports, HlmDialogImports],
  template: `
    <hlm-dialog-header>
      <h2 hlmDialogTitle>{{ ask.title }}</h2>
      @if (ask.description) {
        <p hlmDialogDescription>{{ ask.description }}</p>
      }
    </hlm-dialog-header>
    <!-- Cancel comes first, so the dialog opens focused on the safe choice. -->
    <hlm-dialog-footer>
      <button hlmBtn variant="outline" (click)="ref.close('cancel')">
        {{ ask.cancel ?? 'Cancel' }}
      </button>
      <button
        hlmBtn
        [variant]="
          ask.isDestructive
            ? 'destructive'
            : ask.alternative
              ? 'outline'
              : 'default'
        "
        (click)="ref.close('confirm')"
      >
        {{ ask.confirm }}
      </button>
      @if (ask.alternative) {
        <button hlmBtn (click)="ref.close('alternative')">
          {{ ask.alternative }}
        </button>
      }
    </hlm-dialog-footer>
  `,
  // The dialog's own gap only reaches its direct children, and a fixed width
  // keeps short questions from shrinking it.
  host: { class: 'grid gap-6 sm:w-sm' },
})
export class ConfirmDialog {
  protected readonly ref = inject<BrnDialogRef<Answer>>(BrnDialogRef);
  protected readonly ask = injectBrnDialogContext<Confirmation>();
}

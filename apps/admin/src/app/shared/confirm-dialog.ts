import { Component, inject } from '@angular/core';
import { BrnDialogRef, injectBrnDialogContext } from '@spartan-ng/brain/dialog';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import type { Confirmation } from './confirm.service';

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
    <hlm-dialog-footer>
      <button hlmBtn variant="outline" (click)="ref.close(false)">
        {{ ask.cancel ?? 'Cancel' }}
      </button>
      <button
        hlmBtn
        [variant]="ask.isDestructive ? 'destructive' : 'default'"
        (click)="ref.close(true)"
      >
        {{ ask.confirm }}
      </button>
    </hlm-dialog-footer>
  `,
})
export class ConfirmDialog {
  protected readonly ref = inject<BrnDialogRef<boolean>>(BrnDialogRef);
  protected readonly ask = injectBrnDialogContext<Confirmation>();
}

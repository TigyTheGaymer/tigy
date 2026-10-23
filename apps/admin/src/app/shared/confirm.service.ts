import { inject, Service } from '@angular/core';
import { HlmDialogService } from '@spartan-ng/helm/dialog';
import { firstValueFrom } from 'rxjs';
import { ConfirmDialog } from './confirm-dialog';

export interface Confirmation {
  title: string;
  description?: string;
  confirm: string;
  cancel?: string;
  /** A third button, shown as the main choice. */
  alternative?: string;
  isDestructive?: boolean;
}

export type Answer = 'confirm' | 'alternative' | 'cancel';

/** Asks the owner a question in an alert dialog; closing it any other way means cancel. */
@Service()
export class ConfirmService {
  private readonly dialog = inject(HlmDialogService);

  async choose(confirmation: Confirmation): Promise<Answer> {
    const ref = this.dialog.open<Answer, Confirmation>(ConfirmDialog, {
      context: confirmation,
      role: 'alertdialog',
      showCloseButton: false,
    });
    return (await firstValueFrom(ref.closed$)) ?? 'cancel';
  }

  async ask(confirmation: Confirmation): Promise<boolean> {
    return (await this.choose(confirmation)) === 'confirm';
  }
}

import { inject, Service } from '@angular/core';
import { HlmDialogService } from '@spartan-ng/helm/dialog';
import { firstValueFrom } from 'rxjs';
import { ConfirmDialog } from './confirm-dialog';

export interface Confirmation {
  title: string;
  description?: string;
  confirm: string;
  cancel?: string;
  isDestructive?: boolean;
}

/** Asks the owner a yes-or-no question in an alert dialog; closing it any other way means no. */
@Service()
export class ConfirmService {
  private readonly dialog = inject(HlmDialogService);

  async ask(confirmation: Confirmation): Promise<boolean> {
    const ref = this.dialog.open<boolean, Confirmation>(ConfirmDialog, {
      context: confirmation,
      role: 'alertdialog',
      showCloseButton: false,
    });
    return (await firstValueFrom(ref.closed$)) === true;
  }
}

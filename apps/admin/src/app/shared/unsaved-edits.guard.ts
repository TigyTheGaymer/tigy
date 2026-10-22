import { inject, Injector } from '@angular/core';
import type { CanDeactivateFn } from '@angular/router';

export interface HasUnsavedEdits {
  hasUnsavedEdits(): boolean;
}

export const LEAVE_QUESTION = {
  title: 'Leave without saving?',
  description: 'Your edits on this page have not been saved.',
  confirm: 'Leave',
  cancel: 'Stay',
  isDestructive: true,
};

/** Asks before leaving an editor with unsaved edits for another admin page. */
export const unsavedEditsGuard: CanDeactivateFn<HasUnsavedEdits> = async (
  page,
) => {
  if (!page.hasUnsavedEdits()) return true;
  const injector = inject(Injector);
  // Loaded only to ask, so the dialog stays out of the admin's first load.
  const { ConfirmService } = await import('./confirm.service');
  return injector.get(ConfirmService).ask(LEAVE_QUESTION);
};

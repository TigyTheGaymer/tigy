import { inject, Injector } from '@angular/core';
import type { CanDeactivateFn } from '@angular/router';

export interface HasUnsavedEdits {
  hasUnsavedEdits(): boolean;
  /** Saves the edits; true when nothing is left unsaved. */
  save?(): Promise<boolean>;
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
  const confirm = injector.get(ConfirmService);
  if (!page.save) return confirm.ask(LEAVE_QUESTION);
  const answer = await confirm.choose({
    ...LEAVE_QUESTION,
    alternative: 'Save and leave',
  });
  if (answer === 'alternative') return page.save();
  return answer === 'confirm';
};

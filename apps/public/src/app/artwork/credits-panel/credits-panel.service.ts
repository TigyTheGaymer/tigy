import { DOCUMENT, inject, Service } from '@angular/core';
import { LOCAL_STORAGE, storedSignal } from '../../shared/storage';

/** index.html applies the stored state before first paint, so the stage never jumps. */
@Service()
export class CreditsPanelService {
  private readonly root = inject(DOCUMENT).documentElement;
  private readonly stored = storedSignal(LOCAL_STORAGE, 'tigy.credits', {
    initial: true,
    parse: (value) => value !== 'closed',
    serialize: (isOpen) => (isOpen ? null : 'closed'),
  });
  readonly isOpen = this.stored.value;

  set(isOpen: boolean): void {
    this.stored.set(isOpen);
    if (isOpen) delete this.root.dataset['credits'];
    else this.root.dataset['credits'] = 'closed';
  }
}

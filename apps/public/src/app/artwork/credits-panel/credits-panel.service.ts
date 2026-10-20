import {
  afterNextRender,
  DOCUMENT,
  inject,
  Service,
  signal,
  type Signal,
} from '@angular/core';
import { local } from '../../browser/storage';

const KEY = 'tigy.credits';

/** index.html applies the stored state before first paint, so the stage never jumps. */
@Service()
export class CreditsPanelService {
  private readonly root = inject(DOCUMENT).documentElement;
  private readonly state = signal(true);
  readonly isOpen: Signal<boolean> = this.state.asReadonly();

  constructor() {
    afterNextRender(() => this.state.set(local.get(KEY) !== 'closed'));
  }

  set(isOpen: boolean): void {
    this.state.set(isOpen);
    if (isOpen) {
      delete this.root.dataset['credits'];
      local.remove(KEY);
    } else {
      this.root.dataset['credits'] = 'closed';
      local.set(KEY, 'closed');
    }
  }
}

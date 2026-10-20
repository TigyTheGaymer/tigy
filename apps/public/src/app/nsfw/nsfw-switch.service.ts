import { afterNextRender, Service, signal, type Signal } from '@angular/core';
import { local } from '../shared/storage';

const STORAGE_KEY = 'tigy.nsfw';

/** Off on the server and during hydration, so both render alike; the stored choice applies after. */
@Service()
export class NsfwSwitchService {
  private readonly state = signal(false);
  readonly isOn: Signal<boolean> = this.state.asReadonly();

  constructor() {
    afterNextRender(() => this.state.set(local.get(STORAGE_KEY) === '1'));
  }

  set(isOn: boolean): void {
    this.state.set(isOn);
    if (isOn) local.set(STORAGE_KEY, '1');
    else local.remove(STORAGE_KEY);
  }
}

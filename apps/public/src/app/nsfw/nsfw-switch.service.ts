import { afterNextRender, Service, signal, type Signal } from '@angular/core';
import { local } from '../browser/storage';

const SWITCH_KEY = 'tigy.nsfw';

/** Off on the server and during hydration, so both render alike; the stored choice applies after. */
@Service()
export class NsfwSwitchService {
  private readonly state = signal(false);
  readonly isOn: Signal<boolean> = this.state.asReadonly();

  constructor() {
    afterNextRender(() => this.state.set(local.get(SWITCH_KEY) === '1'));
  }

  set(isOn: boolean): void {
    this.state.set(isOn);
    if (isOn) local.set(SWITCH_KEY, '1');
    else local.remove(SWITCH_KEY);
  }
}

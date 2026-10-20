import { Service } from '@angular/core';
import { LOCAL_STORAGE, storedSignal } from '../shared/storage';

/** Off on the server and during hydration, so both render alike; the stored choice applies after. */
@Service()
export class NsfwSwitchService {
  private readonly stored = storedSignal(LOCAL_STORAGE, 'tigy.nsfw', {
    initial: false,
    parse: (value) => value === '1',
    serialize: (isOn) => (isOn ? '1' : null),
  });
  readonly isOn = this.stored.value;

  set(isOn: boolean): void {
    this.stored.set(isOn);
  }
}

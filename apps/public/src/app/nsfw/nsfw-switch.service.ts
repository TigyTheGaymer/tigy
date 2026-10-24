import { computed, inject, Service } from '@angular/core';
import { LOCAL_STORAGE, storedSignal } from '../shared/storage';
import { AgeCheckService } from './age-check.service';

/** Off on the server and during hydration, so both render alike; the stored choice applies after. */
@Service()
export class NsfwSwitchService {
  private readonly ageCheck = inject(AgeCheckService);
  private readonly stored = storedSignal(LOCAL_STORAGE, 'tigy.nsfw', {
    initial: false,
    parse: (value) => value === '1',
    serialize: (isOn) => (isOn ? '1' : null),
  });
  // Off for a switch stored on before the age check existed.
  readonly isOn = computed(
    () => this.stored.value() && this.ageCheck.isPassed(),
  );

  set(isOn: boolean): void {
    if (isOn) this.ageCheck.confirm(() => this.stored.set(true));
    else this.stored.set(false);
  }
}

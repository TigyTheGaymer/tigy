import { computed, Service, signal } from '@angular/core';
import { LOCAL_STORAGE, storedSignal } from '../shared/storage';

const ADULT_AGE = 18;

@Service()
export class AgeCheckService {
  private readonly stored = storedSignal(LOCAL_STORAGE, 'tigy.nsfw.age', {
    initial: false,
    parse: (value) => value === '1',
    serialize: (isPassed) => (isPassed ? '1' : null),
  });
  readonly isPassed = this.stored.value;

  private readonly waiting = signal<(() => void) | undefined>(undefined);
  readonly isPending = computed(() => !!this.waiting());

  confirm(then: () => void): void {
    if (this.isPassed()) then();
    else this.waiting.set(then);
  }

  pass(): void {
    const then = this.waiting();
    this.waiting.set(undefined);
    this.stored.set(true);
    then?.();
  }

  dismiss(): void {
    this.waiting.set(undefined);
  }
}

/** `birthday` as a date input gives it, "2008-02-29"; compared by calendar day in local time. */
export function isAdult(birthday: string, today: Date): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthday);
  if (!match) return false;
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getMonth() !== month - 1 || date.getDate() !== day) return false;

  const adultYear = today.getFullYear() - ADULT_AGE;
  const todayMonth = today.getMonth() + 1;
  const todayDay = today.getDate();
  return (
    year < adultYear ||
    (year === adultYear &&
      (month < todayMonth || (month === todayMonth && day <= todayDay)))
  );
}

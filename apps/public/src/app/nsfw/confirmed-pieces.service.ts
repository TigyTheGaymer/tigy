import { afterNextRender, Service, signal } from '@angular/core';
import { session } from '../browser/storage';

const CONFIRMED_KEY = 'tigy.nsfw.confirmed';

/** NSFW pieces shown with the switch off, remembered for the browser session. */
@Service()
export class ConfirmedPiecesService {
  private readonly ids = signal<ReadonlySet<string>>(new Set());

  constructor() {
    afterNextRender(() => this.ids.set(new Set(read())));
  }

  has(id: string): boolean {
    return this.ids().has(id);
  }

  add(id: string): void {
    const ids = new Set([...read(), ...this.ids(), id]);
    this.ids.set(ids);
    session.set(CONFIRMED_KEY, JSON.stringify([...ids]));
  }
}

function read(): string[] {
  try {
    const value: unknown = JSON.parse(session.get(CONFIRMED_KEY) ?? '[]');
    return Array.isArray(value)
      ? value.filter((id): id is string => typeof id === 'string')
      : [];
  } catch {
    return [];
  }
}

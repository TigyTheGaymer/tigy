import { Service } from '@angular/core';
import { SESSION_STORAGE, storedSignal } from '../shared/storage';

/** NSFW pieces shown with the switch off, remembered for the browser session. */
@Service()
export class ConfirmedPiecesService {
  private readonly stored = storedSignal<ReadonlySet<string>>(
    SESSION_STORAGE,
    'tigy.nsfw.confirmed',
    { initial: new Set(), parse, serialize: (ids) => JSON.stringify([...ids]) },
  );

  has(id: string): boolean {
    return this.stored.value().has(id);
  }

  add(id: string): void {
    this.stored.update((ids) => new Set([...ids, id]));
  }
}

function parse(value: string | null): ReadonlySet<string> {
  try {
    const ids: unknown = JSON.parse(value ?? '[]');
    return new Set(
      Array.isArray(ids)
        ? ids.filter((id): id is string => typeof id === 'string')
        : [],
    );
  } catch {
    return new Set();
  }
}

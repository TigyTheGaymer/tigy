import {
  afterNextRender,
  inject,
  InjectionToken,
  signal,
  type Provider,
  type Signal,
} from '@angular/core';

/** Storage that never throws: the browser can refuse it, such as in a private window. */
export class SafeStorage {
  constructor(private readonly open: () => Storage | undefined) {}

  get(key: string): string | null {
    try {
      return this.open()?.getItem(key) ?? null;
    } catch {
      return null;
    }
  }

  set(key: string, value: string): void {
    try {
      this.open()?.setItem(key, value);
    } catch {
      // Not remembered.
    }
  }

  remove(key: string): void {
    try {
      this.open()?.removeItem(key);
    } catch {
      // Not remembered.
    }
  }
}

export const LOCAL_STORAGE = new InjectionToken<SafeStorage>('LOCAL_STORAGE', {
  factory: () => new SafeStorage(() => localStorage),
});

export const SESSION_STORAGE = new InjectionToken<SafeStorage>(
  'SESSION_STORAGE',
  {
    factory: () => new SafeStorage(() => sessionStorage),
  },
);

/** The server has no visitor storage: nothing is read or kept there. */
export function provideServerStorage(): Provider[] {
  const none = new SafeStorage(() => undefined);
  return [
    { provide: LOCAL_STORAGE, useValue: none },
    { provide: SESSION_STORAGE, useValue: none },
  ];
}

export interface StoredSignal<T> {
  readonly value: Signal<T>;
  /** Shows and stores `value`; `null` from `serialize` removes the entry. */
  set(value: T): void;
  /** Like `set`, from the stored value even before the first render has read it. */
  update(change: (value: T) => T): void;
}

/**
 * A value kept in browser storage. It holds `initial` on the server and in the first browser
 * render, so hydration matches, and the stored value after that.
 */
export function storedSignal<T>(
  storage: InjectionToken<SafeStorage>,
  key: string,
  options: {
    initial: T;
    parse: (stored: string | null) => T;
    serialize: (value: T) => string | null;
  },
): StoredSignal<T> {
  const store = inject(storage);
  const state = signal(options.initial);
  let isLoaded = false;
  const load = () => {
    if (isLoaded) return;
    isLoaded = true;
    state.set(options.parse(store.get(key)));
  };
  afterNextRender(load);

  const set = (value: T) => {
    isLoaded = true;
    state.set(value);
    const text = options.serialize(value);
    if (text === null) store.remove(key);
    else store.set(key, text);
  };
  return {
    value: state.asReadonly(),
    set,
    update(change) {
      load();
      set(change(state()));
    },
  };
}

/** Storage that never throws: it is absent on the server and can be refused in the browser. */
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

export const local = new SafeStorage(() =>
  typeof localStorage === 'undefined' ? undefined : localStorage,
);

export const session = new SafeStorage(() =>
  typeof sessionStorage === 'undefined' ? undefined : sessionStorage,
);

import { inject, InjectionToken } from '@angular/core';
import type { Functions } from 'firebase/functions';
import { environment } from './environment';
import { EMULATOR_PORTS, FIREBASE_APP } from './firebase';

// Where the functions run (setGlobalOptions in apps/functions).
const REGION = 'europe-west6';

export interface RebuildResult {
  images: number;
  people: number;
  tags: number;
}

export interface CreditTigyResult {
  changed: number;
}

export interface CreditingImage {
  id: string;
  title?: string;
}

export type DeletePersonResult =
  { deleted: true } | { deleted: false; creditedBy: CreditingImage[] };

/** The owner-only callables, behind a token so tests can replace them. */
export interface Callables {
  rebuildSummaries(): Promise<RebuildResult>;
  creditTigy(): Promise<CreditTigyResult>;
  deletePerson(personId: string): Promise<DeletePersonResult>;
}

/** Loads the Functions SDK on first call, so the account menu adds nothing to the first load. */
export const CALLABLES = new InjectionToken<Callables>('CALLABLES', {
  factory: () => {
    const app = inject(FIREBASE_APP);
    let functions: Promise<Functions> | undefined;
    const call = async <T>(name: string, data?: unknown): Promise<T> => {
      const sdk = await import('firebase/functions');
      functions ??= Promise.resolve().then(() => {
        const f = sdk.getFunctions(app, REGION);
        const host = environment.emulatorHost;
        if (host) {
          sdk.connectFunctionsEmulator(f, host, EMULATOR_PORTS.functions);
        }
        return f;
      });
      const callable = sdk.httpsCallable<unknown, T>(await functions, name);
      return (await callable(data)).data;
    };
    return {
      rebuildSummaries: () => call('rebuildSummaries'),
      creditTigy: () => call('creditTigy'),
      deletePerson: (personId) => call('deletePerson', { personId }),
    };
  },
});

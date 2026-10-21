import type { FirebaseOptions } from 'firebase/app';

// Not in environment.ts: the development build replaces that file.
export interface FirebaseEnvironment {
  firebase: FirebaseOptions;
  /** Set only in development. */
  emulatorHost?: string;
}

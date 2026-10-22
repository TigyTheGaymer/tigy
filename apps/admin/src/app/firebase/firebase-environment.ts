import type { FirebaseOptions } from 'firebase/app';

// Not in environment.ts: the development build replaces that file.
export interface FirebaseEnvironment {
  firebase: FirebaseOptions;
  /** The public site's origin, for links to published artworks. */
  publicSite: string;
  /** Set only in development. */
  emulatorHost?: string;
}

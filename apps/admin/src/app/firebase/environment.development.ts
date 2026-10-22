import type { FirebaseEnvironment } from './firebase-environment';

// Replaces environment.ts in `nx serve admin`, so the admin talks to the local emulators.
export const environment: FirebaseEnvironment = {
  firebase: {
    apiKey: 'demo-key',
    authDomain: 'demo-tigy.firebaseapp.com',
    projectId: 'demo-tigy',
    storageBucket: 'demo-tigy.appspot.com',
    appId: 'demo-app',
  },
  emulatorHost: '127.0.0.1',
  // public-e2e:preview serves the public site against the same emulators.
  publicSite: 'http://localhost:4300',
};

import { inject, InjectionToken } from '@angular/core';
import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  connectAuthEmulator,
  getAuth,
  GoogleAuthProvider,
  onIdTokenChanged,
  signInWithPopup,
  signOut,
  type Auth,
  type Unsubscribe,
  type User,
} from 'firebase/auth';
import { environment } from './environment';

// The ports in firebase.json.
export const EMULATOR_PORTS = { auth: 9099, firestore: 8080, storage: 9199 };

export const FIREBASE_APP = new InjectionToken<FirebaseApp>('FIREBASE_APP', {
  factory: () => initializeApp(environment.firebase),
});

/** Keeps the session in IndexedDB, Firebase's default in a browser. */
export const AUTH = new InjectionToken<Auth>('AUTH', {
  factory: () => {
    const auth = getAuth(inject(FIREBASE_APP));
    const host = environment.emulatorHost;
    if (host) {
      connectAuthEmulator(auth, `http://${host}:${EMULATOR_PORTS.auth}`);
    }
    return auth;
  },
});

/** The Firebase Auth calls the admin makes, behind a token so tests can replace them. */
export interface AuthApi {
  authStateReady(): Promise<void>;
  currentUser(): User | null;
  onIdTokenChanged(next: (user: User | null) => void): Unsubscribe;
  signInWithGoogle(): Promise<User>;
  signOut(): Promise<void>;
}

export const AUTH_API = new InjectionToken<AuthApi>('AUTH_API', {
  factory: () => {
    const auth = inject(AUTH);
    return {
      authStateReady: () => auth.authStateReady(),
      currentUser: () => auth.currentUser,
      onIdTokenChanged: (next) => onIdTokenChanged(auth, next),
      signInWithGoogle: async () =>
        (await signInWithPopup(auth, new GoogleAuthProvider())).user,
      signOut: () => signOut(auth),
    };
  },
});

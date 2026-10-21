import { inject, InjectionToken } from '@angular/core';
import {
  connectFirestoreEmulator,
  getFirestore,
  type Firestore,
} from 'firebase/firestore';
import {
  connectStorageEmulator,
  getStorage,
  type FirebaseStorage,
} from 'firebase/storage';
import { environment } from './environment';
import { EMULATOR_PORTS, FIREBASE_APP } from './firebase';

// Imported only by the lazy Uploads route, so the first load carries just Auth.

export const FIRESTORE = new InjectionToken<Firestore>('FIRESTORE', {
  factory: () => {
    const db = getFirestore(inject(FIREBASE_APP));
    const host = environment.emulatorHost;
    if (host) connectFirestoreEmulator(db, host, EMULATOR_PORTS.firestore);
    return db;
  },
});

export const STORAGE = new InjectionToken<FirebaseStorage>('STORAGE', {
  factory: () => {
    const storage = getStorage(inject(FIREBASE_APP));
    const host = environment.emulatorHost;
    if (host) connectStorageEmulator(storage, host, EMULATOR_PORTS.storage);
    return storage;
  },
});

import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

// Test helpers only; excluded from the functions build. The Admin SDK talks
// to the emulators that `npx nx test functions` starts, which it finds
// through FIRESTORE_EMULATOR_HOST and FIREBASE_STORAGE_EMULATOR_HOST.

const PROJECT_ID = 'demo-tigy';

if (!process.env['FIRESTORE_EMULATOR_HOST']) {
  throw new Error(
    'The functions tests need the emulators: run `npx nx test functions`.',
  );
}

if (!getApps().length) {
  initializeApp({
    projectId: PROJECT_ID,
    storageBucket: `${PROJECT_ID}.appspot.com`,
  });
}

export const db = getFirestore();
export const bucket = getStorage().bucket();

/** Deletes every document and every Storage file. */
export async function clearEmulators(): Promise<void> {
  const host = process.env['FIRESTORE_EMULATOR_HOST'];
  const url = `http://${host}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
  const response = await fetch(url, { method: 'DELETE' });
  if (!response.ok) throw new Error(`Clearing Firestore: ${response.status}`);
  await bucket.deleteFiles({ force: true });
}

/** Reads a summary's JSON `items`, or null when the document is missing. */
export async function readItems<T>(path: string): Promise<T[] | null> {
  const snap = await db.doc(path).get();
  return snap.exists ? (JSON.parse(snap.get('items')) as T[]) : null;
}

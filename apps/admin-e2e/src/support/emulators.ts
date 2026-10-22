import { workspaceRoot } from '@nx/devkit';
import { IMAGES_COLLECTION, imagePaths, type Image } from '@tigy/models';
import { execFileSync } from 'node:child_process';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

// The tests read what the admin stored through the Admin SDK.

const PROJECT_ID = 'demo-tigy';

if (!process.env['FIRESTORE_EMULATOR_HOST']) {
  throw new Error(
    'The end-to-end tests need the emulators: run `npx nx e2e admin-e2e`.',
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

/** Replaces every document and file with the seed's. */
export function seed(): void {
  execFileSync(
    process.execPath,
    ['-r', '@swc-node/register', 'firebase/seed/seed.ts'],
    {
      cwd: workspaceRoot,
      env: { ...process.env, SWC_NODE_PROJECT: 'tsconfig.base.json' },
      stdio: 'inherit',
    },
  );
}

/** A document's fields, or undefined when it doesn't exist. */
export async function readDoc<T = Record<string, unknown>>(
  path: string,
): Promise<T | undefined> {
  return (await db.doc(path).get()).data() as T | undefined;
}

export async function fileExists(path: string): Promise<boolean> {
  return (await bucket.file(path).exists())[0];
}

/**
 * Waits until the Functions emulator serves the sign-up blocking function.
 * An account made before then would have no owner claim, and keep it.
 */
export async function waitForFunctions(): Promise<void> {
  const url = 'http://127.0.0.1:5001/demo-tigy/europe-west6/beforeUserCreated';
  for (let attempt = 0; attempt < 120; attempt++) {
    const response = await fetch(url, { method: 'POST' }).catch(() => null);
    if (response && response.status !== 404) return;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error('The Functions emulator never loaded beforeUserCreated.');
}

/** Artworks as documents only, without files: their thumbnails don't load. */
export async function addImages(
  images: { id: string; fields?: Partial<Image> }[],
): Promise<void> {
  const at = Timestamp.fromDate(new Date('2026-06-01T12:00:00Z'));
  const batch = db.batch();
  for (const { id, fields } of images) {
    const image: Image = {
      sortDate: '2026-06-01',
      published: false,
      nsfw: false,
      artistIds: ['placeholder-artist'],
      characterIds: [],
      tags: [],
      file: {
        original: imagePaths.original(id, 'png'),
        w: 400,
        h: 300,
        bytes: 1000,
        mime: 'image/png',
        animated: false,
        transparent: false,
      },
      createdAt: at,
      updatedAt: at,
      ...fields,
    };
    batch.set(db.collection(IMAGES_COLLECTION).doc(id), image);
  }
  await batch.commit();
}

/** Unpublished, credited and titled, newest first: Batch 1 to Batch `count`. */
export function batchPieces(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `batch-${i + 1}`,
    fields: {
      title: `Batch ${i + 1}`,
      date: '2026-06',
      sortDate: `2026-06-${String(20 - i).padStart(2, '0')}`,
    },
  }));
}

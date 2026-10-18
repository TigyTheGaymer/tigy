import {
  buildGalleryItems,
  buildPeopleItems,
  buildTagCounts,
} from '@tigy/gallery';
import {
  IMAGES_COLLECTION,
  imagePaths,
  META_GALLERY_DOC,
  META_PEOPLE_DOC,
  META_TAGS_DOC,
  PEOPLE_COLLECTION,
  type Image,
  type Person,
  type WithId,
} from '@tigy/models';
import { execFileSync } from 'node:child_process';
import { getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { workspaceRoot } from '@nx/devkit';

// The Functions emulator isn't running, so the tests rebuild the summaries themselves.

const PROJECT_ID = 'demo-tigy';

if (!process.env['FIRESTORE_EMULATOR_HOST']) {
  throw new Error(
    'The end-to-end tests need the emulators: run `npx nx e2e public-e2e`.',
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

export async function seed(): Promise<void> {
  execFileSync(
    process.execPath,
    ['-r', '@swc-node/register', 'firebase/seed/seed.ts'],
    {
      cwd: workspaceRoot,
      env: { ...process.env, SWC_NODE_PROJECT: 'tsconfig.base.json' },
      stdio: 'inherit',
    },
  );
  await cacheExpiry();
}

export async function rebuildSummaries(): Promise<void> {
  const [images, people] = await Promise.all([
    db.collection(IMAGES_COLLECTION).get(),
    db.collection(PEOPLE_COLLECTION).get(),
  ]);
  const imageList = images.docs.map(
    (doc) => ({ ...(doc.data() as Image), id: doc.id }) as WithId<Image>,
  );
  const peopleList = people.docs.map(
    (doc) => ({ ...(doc.data() as Person), id: doc.id }) as WithId<Person>,
  );
  const updatedAt = FieldValue.serverTimestamp();
  await Promise.all([
    db
      .doc(META_GALLERY_DOC)
      .set({ items: buildGalleryItems(imageList), updatedAt }),
    db
      .doc(META_PEOPLE_DOC)
      .set({ items: buildPeopleItems(peopleList), updatedAt }),
    db.doc(META_TAGS_DOC).set({ counts: buildTagCounts(imageList), updatedAt }),
  ]);
  await cacheExpiry();
}

/** Documents only, without files. */
export async function addImages(
  images: { id: string; fields?: Partial<Image> }[],
): Promise<void> {
  const at = Timestamp.now();
  const batch = db.batch();
  for (const { id, fields } of images) {
    const image: Image = {
      sortDate: '2026-01-01',
      published: true,
      nsfw: false,
      artistIds: [],
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
  await rebuildSummaries();
}

/** Tagged `bulk`, one a day from 2026-05-01, so newer than every seeded piece. */
export function bulkPieces(
  count: number,
): { id: string; fields: Partial<Image> }[] {
  return Array.from({ length: count }, (_, i) => {
    const day = new Date(Date.UTC(2026, 4, 1 + i)).toISOString().slice(0, 10);
    return {
      id: `bulk-${String(i + 1).padStart(2, '0')}`,
      fields: {
        title: `Bulk ${i + 1}`,
        sortDate: day,
        date: day,
        tags: ['bulk'],
      },
    };
  });
}

export const SUMMARY_MAX_AGE_MS = Number(
  process.env['SUMMARY_MAX_AGE_MS'] ?? 1000,
);

/** So the next page reads the new summaries. */
export function cacheExpiry(): Promise<void> {
  return new Promise((resolve) =>
    setTimeout(resolve, SUMMARY_MAX_AGE_MS + 100),
  );
}

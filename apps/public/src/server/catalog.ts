import {
  IMAGES_COLLECTION,
  PEOPLE_COLLECTION,
  type Image,
  type Person,
  type WithId,
} from '@tigy/models';
import { getApp, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import type { FileStore } from './files';
import { SUMMARY_MAX_AGE_MS, SummaryCache } from './summary-cache';

/** Everything the data endpoints read. */
export interface Catalog {
  summaries: SummaryCache;
  /** The image, published or not, or null when it does not exist. */
  image(id: string): Promise<WithId<Image> | null>;
  /** The people that exist among `ids`, read in one round trip. */
  people(ids: readonly string[]): Promise<Map<string, WithId<Person>>>;
}

/** The security rules do not apply to the Admin SDK. */
function firebaseApp(): App {
  return getApps().length ? getApp() : initializeApp();
}

/** Only the end-to-end tests set `SUMMARY_MAX_AGE_MS`. */
export function summaryMaxAge(env: NodeJS.ProcessEnv = process.env): number {
  const value = Number(env['SUMMARY_MAX_AGE_MS']);
  return Number.isFinite(value) && value >= 0 ? value : SUMMARY_MAX_AGE_MS;
}

export function firestoreCatalog(): Catalog {
  let db: Firestore | undefined;
  const firestore = () => (db ??= getFirestore(firebaseApp()));

  return {
    summaries: new SummaryCache(async (path) => {
      const snap = await firestore().doc(path).get();
      return snap.exists ? (snap.get('items') as string) : null;
    }, summaryMaxAge()),

    async image(id) {
      const snap = await firestore()
        .collection(IMAGES_COLLECTION)
        .doc(id)
        .get();
      return snap.exists ? { ...(snap.data() as Image), id } : null;
    },

    async people(ids) {
      const unique = [...new Set(ids)];
      const people = new Map<string, WithId<Person>>();
      if (!unique.length) return people;
      const collection = firestore().collection(PEOPLE_COLLECTION);
      const snaps = await firestore().getAll(
        ...unique.map((id) => collection.doc(id)),
      );
      for (const snap of snaps) {
        if (snap.exists) {
          people.set(snap.id, { ...(snap.data() as Person), id: snap.id });
        }
      }
      return people;
    },
  };
}

/** Falls back to the project's default bucket, `{project}.appspot.com`. */
export function storageFiles(): FileStore {
  const bucket = () => {
    const app = firebaseApp();
    const project =
      app.options.projectId ??
      process.env['GOOGLE_CLOUD_PROJECT'] ??
      process.env['GCLOUD_PROJECT'];
    return getStorage(app).bucket(
      app.options.storageBucket ?? `${project}.appspot.com`,
    );
  };

  return {
    async open(path) {
      const file = bucket().file(path);
      try {
        const [metadata] = await file.getMetadata();
        return {
          contentType: metadata.contentType ?? 'application/octet-stream',
          size: Number(metadata.size ?? 0),
          read: () => file.createReadStream(),
        };
      } catch (error: unknown) {
        if ((error as { code?: unknown }).code === 404) return null;
        throw error;
      }
    },
  };
}

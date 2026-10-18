import {
  IMAGES_COLLECTION,
  PEOPLE_COLLECTION,
  type Image,
  type Person,
  type WithId,
} from '@tigy/models';
import { getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { SummaryCache } from './summary-cache';

/** Everything the data endpoints read. */
export interface Catalog {
  summaries: SummaryCache;
  /** The image, published or not, or null when it does not exist. */
  image(id: string): Promise<WithId<Image> | null>;
  /** The people that exist among `ids`, read in one round trip. */
  people(ids: readonly string[]): Promise<Map<string, WithId<Person>>>;
}

/**
 * Reads Firestore with the Admin SDK, which the security rules do not apply to
 * (design D8). The app is initialised on first use, from the server's own
 * credentials and project.
 */
export function firestoreCatalog(): Catalog {
  let db: Firestore | undefined;
  const firestore = () =>
    (db ??= getFirestore(getApps().length ? getApp() : initializeApp()));

  return {
    summaries: new SummaryCache(async (path) => {
      const snap = await firestore().doc(path).get();
      return snap.exists ? (snap.get('items') as string) : null;
    }),

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

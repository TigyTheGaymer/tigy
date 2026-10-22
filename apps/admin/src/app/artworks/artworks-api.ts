import { inject, InjectionToken } from '@angular/core';
import {
  IMAGES_COLLECTION,
  META_TAGS_DOC,
  type Image,
  type TagCounts,
  type WithId,
} from '@tigy/models';
import {
  collection,
  deleteField,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { FIRESTORE } from '../firebase/firestore-storage';

/** The fields the editors change; `null` removes an optional field. */
export interface ImageEdits {
  title?: string | null;
  description?: string | null;
  date?: string | null;
  sortDate?: string;
  published?: boolean;
  nsfw?: boolean;
  artistIds?: string[];
  characterIds?: string[];
  tags?: string[];
}

export type BulkEdits = Pick<ImageEdits, 'published' | 'nsfw'>;

/** A batch holds at most 500 writes. */
export const MAX_BATCH = 500;

/** The Firestore calls for artworks, behind a token so tests can replace them. */
export interface ArtworksApi {
  watchImages(
    next: (images: WithId<Image>[]) => void,
    error: (error: Error) => void,
  ): Unsubscribe;
  update(id: string, edits: ImageEdits): Promise<void>;
  /** One batch: every artwork changes, or none does. */
  updateMany(ids: readonly string[], edits: BulkEdits): Promise<void>;
  deleteMany(ids: readonly string[]): Promise<void>;
  tagCounts(): Promise<TagCounts>;
}

export const ARTWORKS_API = new InjectionToken<ArtworksApi>('ARTWORKS_API', {
  factory: () => {
    const db = inject(FIRESTORE);
    const ref = (id: string) => doc(db, IMAGES_COLLECTION, id);
    const toFields = (edits: ImageEdits) => ({
      ...Object.fromEntries(
        Object.entries(edits).map(([key, value]) => [
          key,
          value === null ? deleteField() : value,
        ]),
      ),
      updatedAt: serverTimestamp(),
    });
    return {
      watchImages: (next, error) =>
        onSnapshot(
          collection(db, IMAGES_COLLECTION),
          (snapshot) =>
            next(
              snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as Image) })),
            ),
          error,
        ),
      update: (id, edits) => updateDoc(ref(id), toFields(edits)),
      updateMany: (ids, edits) => {
        const batch = writeBatch(db);
        for (const id of ids) batch.update(ref(id), toFields(edits));
        return batch.commit();
      },
      deleteMany: (ids) => {
        const batch = writeBatch(db);
        for (const id of ids) batch.delete(ref(id));
        return batch.commit();
      },
      tagCounts: async () =>
        ((await getDoc(doc(db, META_TAGS_DOC))).get('counts') as
          TagCounts | undefined) ?? {},
    };
  },
});

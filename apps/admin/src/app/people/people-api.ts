import { inject, InjectionToken } from '@angular/core';
import {
  PEOPLE_COLLECTION,
  personPaths,
  type Person,
  type SocialLink,
  type WithId,
} from '@tigy/models';
import {
  addDoc,
  collection,
  deleteField,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import { deleteObject, ref, uploadBytes } from 'firebase/storage';
import { FIRESTORE, STORAGE } from '../firebase/firestore-storage';

/** The fields the person editor changes; `avatar: null` removes it. */
export interface PersonEdits {
  name?: string;
  links?: SocialLink[];
  avatar?: string | null;
}

/** The Firestore and Storage calls for people, behind a token so tests can replace them. */
export interface PeopleApi {
  watchPeople(
    next: (people: WithId<Person>[]) => void,
    error: (error: Error) => void,
  ): Unsubscribe;
  /** Returns the new person's ID. */
  create(name: string): Promise<string>;
  update(id: string, edits: PersonEdits): Promise<void>;
  uploadAvatar(id: string, webp: Blob): Promise<void>;
  deleteAvatar(id: string): Promise<void>;
}

export const PEOPLE_API = new InjectionToken<PeopleApi>('PEOPLE_API', {
  factory: () => {
    const db = inject(FIRESTORE);
    const storage = inject(STORAGE);
    return {
      watchPeople: (next, error) =>
        onSnapshot(
          collection(db, PEOPLE_COLLECTION),
          (snapshot) =>
            next(
              snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as Person) })),
            ),
          error,
        ),
      create: async (name) => {
        const at = serverTimestamp();
        const added = await addDoc(collection(db, PEOPLE_COLLECTION), {
          name,
          links: [],
          createdAt: at,
          updatedAt: at,
        });
        return added.id;
      },
      update: (id, edits) =>
        updateDoc(doc(db, PEOPLE_COLLECTION, id), {
          ...edits,
          ...(edits.avatar === null && { avatar: deleteField() }),
          updatedAt: serverTimestamp(),
        }),
      uploadAvatar: async (id, webp) => {
        await uploadBytes(ref(storage, personPaths.avatar(id)), webp, {
          contentType: 'image/webp',
        });
      },
      deleteAvatar: async (id) => {
        try {
          await deleteObject(ref(storage, personPaths.avatar(id)));
        } catch (error) {
          if (
            (error as { code?: string }).code !== 'storage/object-not-found'
          ) {
            throw error;
          }
        }
      },
    };
  },
});

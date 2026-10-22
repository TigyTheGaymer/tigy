import { parsePeopleItems, withPeopleEntry } from '@tigy/gallery';
import {
  META_PEOPLE_DOC,
  PEOPLE_COLLECTION,
  personPaths,
  type Person,
} from '@tigy/models';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { onDocumentWritten } from 'firebase-functions/firestore';
import { afterCommit } from '../shared/after-commit';

/**
 * Keeps the person's entry in `meta/people` current after a write. The entry
 * comes from the person as they are now, re-read inside the transaction, so a
 * late event cannot bring back an old name.
 */
export async function syncPerson(personId: string): Promise<void> {
  const db = getFirestore();
  const personRef = db.collection(PEOPLE_COLLECTION).doc(personId);
  const peopleRef = db.doc(META_PEOPLE_DOC);

  await db.runTransaction(async (tx) => {
    const [person, people] = await tx.getAll(personRef, peopleRef);
    const entries = people.exists ? parsePeopleItems(people.get('items')) : [];
    const items = JSON.stringify(
      withPeopleEntry(
        entries,
        personId,
        (person.data() as Person | undefined) ?? null,
      ),
    );
    tx.set(peopleRef, { items, updatedAt: FieldValue.serverTimestamp() });
  });
}

export async function deleteAvatar(personId: string): Promise<void> {
  await getStorage()
    .bucket()
    .file(personPaths.avatar(personId))
    .delete({ ignoreNotFound: true });
}

export const onPersonWritten = onDocumentWritten(
  { document: `${PEOPLE_COLLECTION}/{personId}`, retry: true },
  async (event) => {
    const { personId } = event.params;
    await syncPerson(personId);
    if (event.data?.before.exists && !event.data.after.exists) {
      await afterCommit(`Deleting the avatar of person ${personId}`, () =>
        deleteAvatar(personId),
      );
    }
  },
);

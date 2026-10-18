import { parsePeopleItems, withPeopleEntry } from '@tigy/gallery';
import { META_PEOPLE_DOC, PEOPLE_COLLECTION, type Person } from '@tigy/models';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { onDocumentWritten } from 'firebase-functions/firestore';

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

export const onPersonWritten = onDocumentWritten(
  `${PEOPLE_COLLECTION}/{personId}`,
  (event) => syncPerson(event.params.personId),
);

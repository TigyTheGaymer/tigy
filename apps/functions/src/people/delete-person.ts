import { IMAGES_COLLECTION, PEOPLE_COLLECTION, TIGY_ID } from '@tigy/models';
import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/https';
import { requireOwner } from '../owner/require-owner';

export interface CreditingImage {
  id: string;
  title?: string;
}

export type DeletePersonResult =
  { deleted: true } | { deleted: false; creditedBy: CreditingImage[] };

/** Deletes a person only when no image, published or not, credits them; otherwise names the images that do. */
export async function deletePerson(
  personId: string,
): Promise<DeletePersonResult> {
  const db = getFirestore();
  const images = db.collection(IMAGES_COLLECTION);
  const [asArtist, asCharacter] = await Promise.all([
    images.where('artistIds', 'array-contains', personId).get(),
    images.where('characterIds', 'array-contains', personId).get(),
  ]);

  const crediting = new Map<string, CreditingImage>();
  for (const doc of [...asArtist.docs, ...asCharacter.docs]) {
    const title = doc.get('title') as string | undefined;
    crediting.set(doc.id, { id: doc.id, ...(title && { title }) });
  }
  if (crediting.size) {
    const creditedBy = [...crediting.values()].sort((a, b) =>
      a.id < b.id ? -1 : 1,
    );
    return { deleted: false, creditedBy };
  }

  await db.collection(PEOPLE_COLLECTION).doc(personId).delete();
  return { deleted: true };
}

export const deletePersonCallable = onCall<{ personId?: unknown }>(
  (request) => {
    requireOwner(request);
    const personId = request.data?.personId;
    if (typeof personId !== 'string' || !personId || personId.includes('/')) {
      throw new HttpsError('invalid-argument', 'personId must be a person ID.');
    }
    if (personId === TIGY_ID) {
      throw new HttpsError(
        'failed-precondition',
        'Tigy is the site’s own person and cannot be deleted.',
      );
    }
    return deletePerson(personId);
  },
);

import { IMAGES_COLLECTION, TIGY_ID } from '@tigy/models';
import {
  FieldValue,
  getFirestore,
  type DocumentData,
} from 'firebase-admin/firestore';
import { onCall } from 'firebase-functions/https';
import { requireOwner } from '../owner/require-owner';

export interface CreditTigyResult {
  changed: number;
}

// The rules cap credit lists at 50, so a longer one couldn't be saved from the editor.
const MAX_CREDITS = 50;
// Firestore's limit on writes in one transaction.
const CHUNK = 500;

/** Tigy first, then the other characters in their order; `undefined` when nothing should change. */
export function creditTigyFirst(
  characterIds: readonly string[],
): string[] | undefined {
  if (characterIds.includes(TIGY_ID) || characterIds.length >= MAX_CREDITS) {
    return undefined;
  }
  return [TIGY_ID, ...characterIds];
}

const characterIdsOf = (data: DocumentData | undefined) =>
  (data?.['characterIds'] as string[] | undefined) ?? [];

/**
 * Credits Tigy as a character on every image that lacks the credit. Each chunk
 * re-reads its images in a transaction, so a credit edit saved meanwhile is
 * kept rather than overwritten.
 */
export async function creditTigy(): Promise<CreditTigyResult> {
  const db = getFirestore();
  const images = db.collection(IMAGES_COLLECTION);
  const snaps = await images.select('characterIds').get();
  const ids = snaps.docs
    .filter((doc) => creditTigyFirst(characterIdsOf(doc.data())) !== undefined)
    .map((doc) => doc.id);

  let changed = 0;
  for (let i = 0; i < ids.length; i += CHUNK) {
    const refs = ids.slice(i, i + CHUNK).map((id) => images.doc(id));
    changed += await db.runTransaction(async (tx) => {
      const docs = await tx.getAll(...refs);
      let count = 0;
      for (const doc of docs) {
        if (!doc.exists) continue;
        const characterIds = creditTigyFirst(characterIdsOf(doc.data()));
        if (!characterIds) continue;
        tx.update(doc.ref, {
          characterIds,
          updatedAt: FieldValue.serverTimestamp(),
        });
        count++;
      }
      return count;
    });
  }
  return { changed };
}

export const creditTigyCallable = onCall((request) => {
  requireOwner(request);
  return creditTigy();
});

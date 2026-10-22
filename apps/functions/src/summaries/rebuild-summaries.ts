import {
  buildGalleryItems,
  buildPeopleItems,
  buildTagCounts,
} from '@tigy/gallery';
import {
  IMAGES_COLLECTION,
  META_GALLERY_DOC,
  META_PEOPLE_DOC,
  META_TAGS_DOC,
  PEOPLE_COLLECTION,
  type Image,
  type Person,
  type WithId,
} from '@tigy/models';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { onCall } from 'firebase-functions/https';
import { requireOwner } from '../owner/require-owner';

export interface RebuildResult {
  images: number;
  people: number;
  tags: number;
}

/** Rewrites `meta/gallery`, `meta/people` and `meta/tags` from every image and person, for when a summary has drifted. */
export async function rebuildSummaries(): Promise<RebuildResult> {
  const db = getFirestore();
  const [imageSnaps, personSnaps] = await Promise.all([
    db.collection(IMAGES_COLLECTION).get(),
    db.collection(PEOPLE_COLLECTION).get(),
  ]);
  const images = imageSnaps.docs.map(
    (doc) => ({ ...doc.data(), id: doc.id }) as WithId<Image>,
  );
  const people = personSnaps.docs.map(
    (doc) => ({ ...doc.data(), id: doc.id }) as WithId<Person>,
  );
  const counts = buildTagCounts(images);
  const updatedAt = FieldValue.serverTimestamp();

  const batch = db.batch();
  batch.set(db.doc(META_GALLERY_DOC), {
    items: buildGalleryItems(images),
    updatedAt,
  });
  batch.set(db.doc(META_PEOPLE_DOC), {
    items: buildPeopleItems(people),
    updatedAt,
  });
  batch.set(db.doc(META_TAGS_DOC), { counts, updatedAt });
  await batch.commit();

  return {
    images: images.length,
    people: people.length,
    tags: Object.keys(counts).length,
  };
}

export const rebuildSummariesCallable = onCall((request) => {
  requireOwner(request);
  return rebuildSummaries();
});

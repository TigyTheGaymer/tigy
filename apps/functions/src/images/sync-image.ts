import {
  adjustTagCounts,
  parseGalleryItems,
  withGalleryRow,
} from '@tigy/gallery';
import {
  IMAGES_COLLECTION,
  imagePaths,
  META_GALLERY_DOC,
  META_TAGS_DOC,
  type Image,
  type TagCounts,
  UPLOADS_COLLECTION,
  uploadPaths,
} from '@tigy/models';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { onDocumentWritten } from 'firebase-functions/firestore';
import * as logger from 'firebase-functions/logger';
import { afterCommit } from '../shared/after-commit';

/** The size of one Firestore document; `meta/gallery` must stay below it. */
const DOCUMENT_LIMIT = 1024 * 1024;
const WARN_AT = 0.7;

/**
 * Keeps `meta/gallery` and `meta/tags` current after an image is written. The row comes from the
 * image as it is now, re-read inside the transaction, so events that arrive out of order cannot
 * write a stale row. Tag counts move by the difference between the tags before and after.
 */
export async function syncImage(
  imageId: string,
  tagsBefore: readonly string[],
  tagsAfter: readonly string[],
): Promise<void> {
  const db = getFirestore();
  const imageRef = db.collection(IMAGES_COLLECTION).doc(imageId);
  const galleryRef = db.doc(META_GALLERY_DOC);
  const tagsRef = db.doc(META_TAGS_DOC);

  const items = await db.runTransaction(async (tx) => {
    const [image, gallery, tags] = await tx.getAll(
      imageRef,
      galleryRef,
      tagsRef,
    );
    const rows = gallery.exists ? parseGalleryItems(gallery.get('items')) : [];
    const items = JSON.stringify(
      withGalleryRow(
        rows,
        imageId,
        (image.data() as Image | undefined) ?? null,
      ),
    );
    const counts: TagCounts = tags.get('counts') ?? {};
    tx.set(galleryRef, { items, updatedAt: FieldValue.serverTimestamp() });
    tx.set(tagsRef, {
      counts: adjustTagCounts(counts, tagsBefore, tagsAfter),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return items;
  });

  const bytes = Buffer.byteLength(items, 'utf8');
  if (bytes > DOCUMENT_LIMIT * WARN_AT) {
    logger.warn(
      `meta/gallery is ${Math.round((bytes / DOCUMENT_LIMIT) * 100)}% of the 1 MiB document limit`,
      { bytes },
    );
  }
}

/**
 * Removes every file of a deleted image, so none of them can still be opened,
 * and its upload record, so its row leaves the upload list. Deleting the
 * record also fires `onUploadDeleted`, which finds nothing left to do.
 */
export async function deleteImageFiles(imageId: string): Promise<void> {
  const bucket = getStorage().bucket();
  await bucket.deleteFiles({ prefix: imagePaths.folder(imageId), force: true });
  await bucket.deleteFiles({
    prefix: uploadPaths.folder(imageId),
    force: true,
  });
  await getFirestore().collection(UPLOADS_COLLECTION).doc(imageId).delete();
}

export const onImageWritten = onDocumentWritten(
  { document: `${IMAGES_COLLECTION}/{imageId}`, retry: true },
  async (event) => {
    const { imageId } = event.params;
    const before = event.data?.before.data() as Image | undefined;
    const after = event.data?.after.data() as Image | undefined;
    await syncImage(imageId, before?.tags ?? [], after?.tags ?? []);
    if (before && !after) {
      await afterCommit(`Deleting the files of image ${imageId}`, () =>
        deleteImageFiles(imageId),
      );
    }
  },
);

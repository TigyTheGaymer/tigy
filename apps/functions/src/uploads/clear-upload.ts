import {
  IMAGES_COLLECTION,
  imagePaths,
  UPLOADS_COLLECTION,
  uploadPaths,
} from '@tigy/models';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { onDocumentDeleted } from 'firebase-functions/firestore';

/**
 * Cleans up after the owner clears an upload's row: the upload's
 * own files always, and the artwork's files only when no artwork exists, which
 * is what a run that crashed or was killed halfway leaves behind.
 */
export async function clearUpload(uploadId: string): Promise<void> {
  const bucket = getStorage().bucket();
  await bucket.deleteFiles({
    prefix: uploadPaths.folder(uploadId),
    force: true,
  });
  const image = await getFirestore()
    .collection(IMAGES_COLLECTION)
    .doc(uploadId)
    .get();
  if (!image.exists) {
    await bucket.deleteFiles({
      prefix: imagePaths.folder(uploadId),
      force: true,
    });
  }
}

export const onUploadDeleted = onDocumentDeleted(
  `${UPLOADS_COLLECTION}/{uploadId}`,
  (event) => clearUpload(event.params.uploadId),
);

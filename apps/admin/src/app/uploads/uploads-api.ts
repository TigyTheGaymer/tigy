import { inject, InjectionToken } from '@angular/core';
import {
  IMAGES_COLLECTION,
  UPLOADS_COLLECTION,
  type Upload,
  type WithId,
} from '@tigy/models';
import {
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  type Unsubscribe,
} from 'firebase/firestore';
import {
  ref,
  uploadBytesResumable,
  type UploadMetadata,
} from 'firebase/storage';
import { FIRESTORE, STORAGE } from '../firebase/firestore-storage';

export interface RunningUpload {
  done: Promise<void>;
  cancel(): void;
}

/** The Firestore and Storage calls of the Uploads page, behind a token so tests can replace them. */
export interface UploadsApi {
  /** A new Firestore auto-ID; writes nothing. */
  newId(): string;
  upload(
    path: string,
    file: Blob,
    metadata: UploadMetadata,
    onProgress: (fraction: number) => void,
  ): RunningUpload;
  watchUploads(
    count: number,
    next: (records: WithId<Upload>[]) => void,
    error: (error: Error) => void,
  ): Unsubscribe;
  deleteRecord(uploadId: string): Promise<void>;
}

export const UPLOADS_API = new InjectionToken<UploadsApi>('UPLOADS_API', {
  factory: () => {
    const db = inject(FIRESTORE);
    const storage = inject(STORAGE);
    return {
      newId: () => doc(collection(db, IMAGES_COLLECTION)).id,
      upload: (path, file, metadata, onProgress) => {
        const task = uploadBytesResumable(ref(storage, path), file, metadata);
        task.on('state_changed', (snapshot) =>
          onProgress(snapshot.bytesTransferred / (snapshot.totalBytes || 1)),
        );
        return {
          done: (async () => {
            await task;
          })(),
          cancel: () => void task.cancel(),
        };
      },
      watchUploads: (count, next, error) =>
        onSnapshot(
          query(
            collection(db, UPLOADS_COLLECTION),
            orderBy('createdAt', 'desc'),
            limit(count),
          ),
          (snapshot) =>
            next(
              snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as Upload) })),
            ),
          error,
        ),
      deleteRecord: (uploadId) =>
        deleteDoc(doc(db, UPLOADS_COLLECTION, uploadId)),
    };
  },
});

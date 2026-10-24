import type { TimestampLike } from './firestore.model';
import type { ImageFile } from './image.model';

export const UPLOADS_COLLECTION = 'uploads';

export type UploadStatus = 'processing' | 'ready' | 'failed';

/** Stored as a code; the admin turns it into words. */
export type UploadError =
  | 'unsupported'
  | 'damaged'
  | 'too-large'
  | 'file-too-large'
  | 'video-too-long'
  | 'video-too-large'
  | 'unreadable'
  | 'internal';

/**
 * `uploads/{uploadId}`: one file's way through processing, written only by Cloud Functions.
 * The upload's ID is also the ID of the artwork it becomes.
 */
export interface Upload {
  /** As picked by the owner. */
  fileName: string;
  /** As uploaded, before metadata removal. */
  bytes: number;
  status: UploadStatus;
  error?: UploadError;
  /** Copied from the image when ready, so the upload list needs no image reads. */
  file?: Pick<
    ImageFile,
    'w' | 'h' | 'bytes' | 'mime' | 'animated' | 'durationMs'
  >;
  createdAt: TimestampLike;
  updatedAt: TimestampLike;
}

export const uploadPaths = {
  folder: (uploadId: string) => `uploads/${uploadId}/`,
  source: (uploadId: string) => `uploads/${uploadId}/source`,
};

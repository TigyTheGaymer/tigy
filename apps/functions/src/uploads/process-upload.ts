import { sortDateFor } from '@tigy/gallery';
import {
  IMAGES_COLLECTION,
  imagePaths,
  UPLOADS_COLLECTION,
  type Image,
  type Upload,
  type UploadError,
} from '@tigy/models';
import {
  detectImageFormat,
  FORMAT_SIGNATURE_BYTES,
  IMAGE_FORMATS,
  type ImageFormat,
} from '@tigy/uploads';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import * as logger from 'firebase-functions/logger';
import { onObjectFinalized } from 'firebase-functions/storage';
import { randomUUID } from 'node:crypto';
import { loadSharp } from './load-sharp';
import {
  DamagedImageError,
  stripMetadata,
} from './strip-metadata/strip-metadata';
import { makeWebVersions } from './web-versions';

/** Width × height × frames. About 1 GB once decoded to RGBA, which 4 GiB of memory leaves room to resize. */
export const MAX_PIXELS = 250_000_000;

export interface UploadedObject {
  name: string;
  size: number | string;
  metadata?: Record<string, string>;
}

/** A failure with a reason the owner can act on; anything else is `internal`. */
class UploadFailure extends Error {
  constructor(readonly code: UploadError) {
    super(code);
  }
}

const SOURCE_PATH = /^uploads\/([^/]+)\/source$/;
// Firestore's error code when create() finds the document already there.
const ALREADY_EXISTS = 6;

/**
 * Turns `uploads/{id}/source` into the artwork `images/{id}` with its three
 * files. Returns at once for every other object, including its own
 * writes under `images/`.
 */
export async function processUploadedObject(
  object: UploadedObject,
): Promise<void> {
  const uploadId = SOURCE_PATH.exec(object.name)?.[1];
  if (!uploadId) return;

  const bucket = getStorage().bucket();
  const source = bucket.file(object.name);
  const [exists] = await source.exists();
  // An earlier run finished with it, or the lifecycle rule removed it.
  if (!exists) return;

  const db = getFirestore();
  const recordRef = db.collection(UPLOADS_COLLECTION).doc(uploadId);
  const now = Timestamp.now();
  const record: Upload = {
    fileName: object.metadata?.['fileName'] || 'unnamed',
    bytes: Number(object.size),
    status: 'processing',
    createdAt: now,
    updatedAt: now,
  };
  try {
    await recordRef.create(record);
  } catch (error) {
    // Another delivery of this event got there first.
    if ((error as { code?: number }).code === ALREADY_EXISTS) return;
    throw error;
  }

  const written: string[] = [];
  let isImageCreated = false;
  const save = async (path: string, data: Buffer, contentType: string) => {
    written.push(path);
    await bucket.file(path).save(data, {
      resumable: false,
      metadata: {
        contentType,
        // The Admin SDK adds no download token, and without one the admin's
        // getDownloadURL() fails. `get` on images/ is public anyway.
        metadata: { firebaseStorageDownloadTokens: randomUUID() },
      },
    });
  };

  try {
    const [bytes] = await source.download();
    const format = detectImageFormat(bytes.subarray(0, FORMAT_SIGNATURE_BYTES));
    if (!format) throw new UploadFailure('unsupported');
    await checkPixels(bytes);

    const { data: original, removed } = stripMetadata(bytes, format);
    const { ext, mime } = IMAGE_FORMATS[format];
    const originalPath = imagePaths.original(uploadId, ext);
    await save(originalPath, original, mime);

    const { full, thumb, file } = await webVersions(original, format);
    await save(imagePaths.full(uploadId), full, 'image/webp');
    await save(imagePaths.thumb(uploadId), thumb, 'image/webp');

    const image: Image = {
      published: false,
      nsfw: false,
      artistIds: [],
      characterIds: [],
      tags: [],
      sortDate: sortDateFor(undefined, now.toDate()),
      file: { original: originalPath, ...file },
      createdAt: now,
      updatedAt: now,
    };
    await db.collection(IMAGES_COLLECTION).doc(uploadId).create(image);
    isImageCreated = true;

    const { w, h, bytes: fileBytes, mime: fileMime, animated } = file;
    await recordRef.update({
      status: 'ready',
      file: { w, h, bytes: fileBytes, mime: fileMime, animated },
      updatedAt: Timestamp.now(),
    } satisfies Partial<Upload>);
    await source.delete({ ignoreNotFound: true });
    logger.info('Processed an upload', { uploadId, format, removed });
  } catch (error) {
    // The files now belong to the artwork. The record stays processing and
    // shows as "took too long"; clearing it keeps the artwork's files.
    if (isImageCreated) throw error;
    const code = errorCode(error);
    if (code === 'internal') {
      logger.error('Processing an upload failed', { uploadId, error });
    } else {
      logger.warn('Refused an upload', { uploadId, code });
    }
    await Promise.all(
      [...written, object.name].map((path) =>
        bucket.file(path).delete({ ignoreNotFound: true }),
      ),
    );
    await recordRef.update({
      status: 'failed',
      error: code,
      updatedAt: Timestamp.now(),
    } satisfies Partial<Upload>);
  }
}

/** Reads only the header, so an oversized picture fails before anything is decoded. */
async function checkPixels(bytes: Buffer): Promise<void> {
  const sharp = await loadSharp();
  const meta = await asDamaged(
    sharp(bytes, { animated: true, limitInputPixels: false }).metadata(),
  );
  const height = meta.pageHeight ?? meta.height;
  if (meta.width * height * (meta.pages ?? 1) > MAX_PIXELS) {
    throw new UploadFailure('too-large');
  }
}

function webVersions(original: Buffer, format: ImageFormat) {
  return asDamaged(makeWebVersions(original, format));
}

/** sharp's errors mean it could not decode the file. */
async function asDamaged<T>(work: Promise<T>): Promise<T> {
  try {
    return await work;
  } catch (error) {
    logger.warn('sharp could not read an upload', { error: String(error) });
    throw new UploadFailure('damaged');
  }
}

function errorCode(error: unknown): UploadError {
  if (error instanceof UploadFailure) return error.code;
  if (error instanceof DamagedImageError) return 'damaged';
  return 'internal';
}

export const processUpload = onObjectFinalized(
  {
    memory: '4GiB',
    cpu: 2,
    timeoutSeconds: 540,
    concurrency: 1,
    maxInstances: 2,
    // Processing errors are recorded and return normally, so a retry only
    // follows a run that never finished: refused at maxInstances, or crashed.
    retry: true,
  },
  (event) => processUploadedObject(event.data),
);

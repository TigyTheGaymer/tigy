import { sortDateFor } from '@tigy/gallery';
import {
  IMAGES_COLLECTION,
  imagePaths,
  TIGY_ID,
  UPLOADS_COLLECTION,
  type Image,
  type ImageFile,
  type Upload,
  type UploadError,
} from '@tigy/models';
import {
  detectFormat,
  FORMAT_SIGNATURE_BYTES,
  FORMATS,
  isVideoFormat,
  maxBytesFor,
  type ImageFormat,
  type VideoFormat,
} from '@tigy/uploads';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import * as logger from 'firebase-functions/logger';
import { onObjectFinalized } from 'firebase-functions/storage';
import { randomUUID } from 'node:crypto';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadSharp } from './load-sharp';
import {
  DamagedImageError,
  stripMetadata,
} from './strip-metadata/strip-metadata';
import { UploadFailure } from './upload-failure';
import { processVideo } from './video/process-video';
import { makeWebVersions } from './web-versions';

/** Width × height × frames. 500 million (a 320-frame 1440×1080 GIF) peaked at 1.4 GB, well inside 4 GiB. */
export const MAX_PIXELS = 1_000_000_000;

/** Each upload works in a directory named so, removed when it ends. */
export const WORK_DIR_PREFIX = 'tigy-upload-';

/** Leaves time within the function's 540 s to save the files, or to clean up after a step that ran out. */
const PROCESSING_BUDGET_MS = 480_000;

export interface UploadedObject {
  name: string;
  size: number | string;
  metadata?: Record<string, string>;
}

interface FileToSave {
  path: string;
  /** The bytes, or a local file's path. */
  data: Buffer | string;
  contentType: string;
}

interface ProcessedUpload {
  files: FileToSave[];
  file: ImageFile;
  /** What the strippers removed, for the log. */
  removed?: unknown;
}

const SOURCE_PATH = /^uploads\/([^/]+)\/source$/;
// Firestore's error code when create() finds the document already there.
const ALREADY_EXISTS = 6;

/**
 * Turns `uploads/{id}/source` into the artwork `images/{id}` with its files.
 * Returns at once for every other object, including its own writes under
 * `images/`.
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
  const save = async ({ path, data, contentType }: FileToSave) => {
    written.push(path);
    const options = {
      resumable: false,
      metadata: {
        contentType,
        // The Admin SDK adds no download token, and without one the admin's
        // getDownloadURL() fails. `get` on images/ is public anyway.
        metadata: { firebaseStorageDownloadTokens: randomUUID() },
      },
    };
    if (typeof data === 'string') {
      await bucket.upload(data, { ...options, destination: path });
    } else {
      await bucket.file(path).save(data, options);
    }
  };

  const deadline = Date.now() + PROCESSING_BUDGET_MS;
  await removeWorkDirsLeftBehind();
  const workDir = await mkdtemp(
    join(tmpdir(), `${WORK_DIR_PREFIX}${uploadId}-`),
  );
  try {
    // A range of an empty object fails, and an empty file has no format anyway.
    const [head] =
      record.bytes > 0
        ? await source.download({ start: 0, end: FORMAT_SIGNATURE_BYTES - 1 })
        : [Buffer.alloc(0)];
    const format = detectFormat(head);
    if (!format) throw new UploadFailure('unsupported');
    // Storage judged the size by the declared type, not the content.
    if (record.bytes > maxBytesFor(format)) {
      throw new UploadFailure('file-too-large');
    }

    const processed = isVideoFormat(format)
      ? await videoFiles(uploadId, format, workDir, deadline, (path) =>
          source.download({ destination: path }),
        )
      : await imageFiles(uploadId, format, (await source.download())[0]);
    for (const file of processed.files) await save(file);

    const image: Image = {
      published: false,
      nsfw: false,
      artistIds: [],
      characterIds: [TIGY_ID],
      tags: [],
      sortDate: sortDateFor(undefined, now.toDate()),
      file: processed.file,
      createdAt: now,
      updatedAt: now,
    };
    await db.collection(IMAGES_COLLECTION).doc(uploadId).create(image);
    isImageCreated = true;

    const { w, h, bytes, mime, animated, durationMs } = processed.file;
    await recordRef.update({
      status: 'ready',
      file: {
        w,
        h,
        bytes,
        mime,
        animated,
        ...(durationMs === undefined ? {} : { durationMs }),
      },
      updatedAt: Timestamp.now(),
    } satisfies Partial<Upload>);
    await source.delete({ ignoreNotFound: true });
    logger.info('Processed an upload', {
      uploadId,
      format,
      removed: processed.removed,
    });
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
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

async function imageFiles(
  uploadId: string,
  format: ImageFormat,
  bytes: Buffer,
): Promise<ProcessedUpload> {
  await checkPixels(bytes);
  const { data: original, removed } = stripMetadata(bytes, format);
  const { ext, mime } = FORMATS[format];
  const originalPath = imagePaths.original(uploadId, ext);
  const { full, thumb, file } = await asDamaged(
    makeWebVersions(original, format),
  );
  return {
    files: [
      { path: originalPath, data: original, contentType: mime },
      {
        path: imagePaths.full(uploadId),
        data: full,
        contentType: 'image/webp',
      },
      {
        path: imagePaths.thumb(uploadId),
        data: thumb,
        contentType: 'image/webp',
      },
    ],
    file: { original: originalPath, ...file },
    removed,
  };
}

/** Videos stay on disk: ffmpeg works on files, and a 200 MB source would be held in memory several times over. */
async function videoFiles(
  uploadId: string,
  format: VideoFormat,
  workDir: string,
  deadline: number,
  downloadTo: (path: string) => Promise<unknown>,
): Promise<ProcessedUpload> {
  const sourcePath = join(workDir, 'source');
  await downloadTo(sourcePath);
  const video = await processVideo(sourcePath, format, workDir, deadline);
  const { ext, mime } = FORMATS[format];
  const originalPath = imagePaths.original(uploadId, ext);
  return {
    files: [
      { path: originalPath, data: video.original, contentType: mime },
      {
        path: imagePaths.video(uploadId),
        data: video.video,
        contentType: 'video/mp4',
      },
      {
        path: imagePaths.preview(uploadId),
        data: video.preview,
        contentType: 'video/mp4',
      },
      {
        path: imagePaths.full(uploadId),
        data: video.full,
        contentType: 'image/webp',
      },
      {
        path: imagePaths.thumb(uploadId),
        data: video.thumb,
        contentType: 'image/webp',
      },
    ],
    file: { original: originalPath, ...video.file },
  };
}

/**
 * A run killed at the function's timeout never reaches its `finally`, and /tmp
 * counts against the instance's memory. An instance processes one upload at a
 * time, so any directory found here is left over.
 */
async function removeWorkDirsLeftBehind(): Promise<void> {
  const names = await readdir(tmpdir());
  await Promise.all(
    names
      .filter((name) => name.startsWith(WORK_DIR_PREFIX))
      .map((name) =>
        rm(join(tmpdir(), name), { recursive: true, force: true }),
      ),
  );
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
    // x264 uses every core. 4 vCPUs need at least 2 GiB on Cloud Run.
    cpu: 4,
    timeoutSeconds: 540,
    concurrency: 1,
    maxInstances: 2,
    // Processing errors are recorded and return normally, so a retry only
    // follows a run that never finished: refused at maxInstances, or crashed.
    retry: true,
  },
  (event) => processUploadedObject(event.data),
);

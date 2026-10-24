import { ID_PATTERN } from '@tigy/gallery';
import { imagePaths, personPaths, type GalleryRow } from '@tigy/models';
import {
  Router,
  type NextFunction,
  type Request,
  type Response,
} from 'express';
import type { Readable } from 'node:stream';
import { CDN_CACHE_CONTROL, FILE_CACHE_CONTROL } from './cache-control';
import type { SummaryCache } from './summary-cache';

/** Both ends included, as in a `Range` header. */
export interface ByteRange {
  start: number;
  end: number;
}

export interface StoredFile {
  contentType: string;
  size: number;
  read(range?: ByteRange): Readable;
}

/** `open` resolves to null when the file does not exist. */
export interface FileStore {
  open(path: string): Promise<StoredFile | null>;
}

const ORIGINAL = /^original\.([a-z0-9]{1,5})$/;

const WEB_FILES: Record<string, (id: string) => string> = {
  'thumb.webp': imagePaths.thumb,
  'full.webp': imagePaths.full,
  'full.mp4': imagePaths.video,
  'preview.mp4': imagePaths.preview,
};

/** "Hey Pookie!" gives "hey-pookie.png"; without a usable title, "tigy-{id}.png". */
export function downloadName(
  id: string,
  title: string | undefined,
  ext: string,
): string {
  const slug = (title ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${slug || `tigy-${id}`}.${ext}`;
}

/** NSFW flags and titles come from the cached summary, so serving a file costs no Firestore read. */
export function filesRouter(store: FileStore, summaries: SummaryCache): Router {
  const router = Router();

  router.get(
    '/img/:id/:file',
    handle(async (req, res) => {
      const id = String(req.params['id']);
      const file = String(req.params['file']);
      const original = ORIGINAL.exec(file);
      const path = !ID_PATTERN.test(id)
        ? undefined
        : original
          ? imagePaths.original(id, original[1])
          : Object.hasOwn(WEB_FILES, file)
            ? WEB_FILES[file](id)
            : undefined;
      if (!path) {
        notFound(res);
        return;
      }
      const stored = await store.open(path);
      if (!stored) {
        notFound(res);
        return;
      }
      const row = (await summaries.gallery()).find(
        (candidate: GalleryRow) => candidate.id === id,
      );
      if (row?.nsfw) res.set('X-Robots-Tag', 'noindex');
      if (original) res.attachment(downloadName(id, row?.title, original[1]));
      send(req, res, stored);
    }),
  );

  router.get(
    '/avatars/:file',
    handle(async (req, res) => {
      const file = String(req.params['file']);
      const id = file.endsWith('.webp') ? file.slice(0, -'.webp'.length) : '';
      const stored = ID_PATTERN.test(id)
        ? await store.open(personPaths.avatar(id))
        : null;
      if (!stored) {
        notFound(res);
        return;
      }
      send(req, res, stored);
    }),
  );

  return router;
}

/**
 * The one range of `bytes=a-b`, `bytes=a-` or `bytes=-n`, clamped to the file;
 * `unsatisfiable` when it starts past the end. Anything else, multiple ranges
 * included, reads as no range: HTTP allows sending the whole file instead.
 */
export function parseRange(
  header: string | undefined,
  size: number,
): ByteRange | 'unsatisfiable' | undefined {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header?.trim() ?? '');
  if (!match || (!match[1] && !match[2])) return undefined;
  if (!match[1]) {
    const suffix = Number(match[2]);
    if (suffix === 0 || size === 0) return 'unsatisfiable';
    return { start: Math.max(0, size - suffix), end: size - 1 };
  }
  const start = Number(match[1]);
  const end = match[2] ? Number(match[2]) : Infinity;
  if (end < start) return undefined;
  if (start >= size) return 'unsatisfiable';
  return { start, end: Math.min(end, size - 1) };
}

/** Safari plays a video only from 206 responses, and seeking shouldn't download the whole file. */
function send(req: Request, res: Response, file: StoredFile): void {
  res.set('Cache-Control', FILE_CACHE_CONTROL);
  res.set('Accept-Ranges', 'bytes');
  res.type(file.contentType);
  const range = parseRange(req.headers.range, file.size);
  if (range === 'unsatisfiable') {
    res.status(416).set('Content-Range', `bytes */${file.size}`).end();
    return;
  }
  if (range) {
    res.status(206);
    res.set('Content-Range', `bytes ${range.start}-${range.end}/${file.size}`);
  }
  const length = range ? range.end - range.start + 1 : file.size;
  res.set('Content-Length', String(length));
  const stream = file.read(range);
  stream.on('error', () => res.destroy());
  stream.pipe(res);
}

/** Cached briefly, like a page, so a new upload loads soon. */
function notFound(res: Response): void {
  res.set('Cache-Control', CDN_CACHE_CONTROL);
  res.status(404).type('text/plain').send('Not found.');
}

/** Passes a failed read to Express's error handling, which must not be cached. */
function handle(
  fn: (req: Request, res: Response) => Promise<void>,
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    fn(req, res).catch((error: unknown) => {
      res.set('Cache-Control', 'no-store');
      next(error);
    });
  };
}

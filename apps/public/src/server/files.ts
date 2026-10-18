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

export interface StoredFile {
  contentType: string;
  size: number;
  read(): Readable;
}

/** `open` resolves to null when the file does not exist. */
export interface FileStore {
  open(path: string): Promise<StoredFile | null>;
}

const ORIGINAL = /^original\.([a-z0-9]{1,5})$/;

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
      if (
        !ID_PATTERN.test(id) ||
        !(file === 'thumb.webp' || file === 'full.webp' || original)
      ) {
        notFound(res);
        return;
      }
      const path =
        file === 'thumb.webp'
          ? imagePaths.thumb(id)
          : file === 'full.webp'
            ? imagePaths.full(id)
            : imagePaths.original(id, original![1]);
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
      send(res, stored);
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
      send(res, stored);
    }),
  );

  return router;
}

function send(res: Response, file: StoredFile): void {
  res.set('Cache-Control', FILE_CACHE_CONTROL);
  res.type(file.contentType);
  res.set('Content-Length', String(file.size));
  const stream = file.read();
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

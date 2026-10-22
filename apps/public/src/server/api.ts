import {
  galleryOverview,
  galleryQueryFromParams,
  matchesQuery,
  neighbours,
  parseCursor,
  queryGallery,
  type Choice,
} from '@tigy/gallery';
import {
  TIGY_ID,
  type GalleryRow,
  type Person,
  type WithId,
} from '@tigy/models';
import {
  Router,
  type NextFunction,
  type Request,
  type Response,
} from 'express';
import type {
  ArtworkResponse,
  CreditedPerson,
  GalleryResponse,
  HomeResponse,
  NeighbourLink,
  PeopleResponse,
  PickerPerson,
} from '../api/types';
import { CDN_CACHE_CONTROL } from './cache-control';
import type { Catalog } from './catalog';

/**
 * The data endpoints the pages read. Every response may be cached by the CDN per URL, and none is
 * indexed by search engines. The NSFW flag (`nsfw=1`) is the only way to receive NSFW rows.
 */
export function apiRouter(catalog: Catalog): Router {
  const router = Router();

  router.use((_req, res, next) => {
    res.set('Cache-Control', CDN_CACHE_CONTROL);
    res.set('X-Robots-Tag', 'noindex');
    next();
  });

  router.get(
    '/gallery',
    handle(async (req, res) => {
      const afterParam = req.query['after'];
      const after =
        typeof afterParam === 'string' ? parseCursor(afterParam) : null;
      if (afterParam !== undefined && !after) {
        res.status(400).json({ error: 'Malformed after cursor.' });
        return;
      }
      const nsfw = nsfwFlag(req);
      const rows = await catalog.summaries.gallery();
      const query = galleryQueryFromParams(req.query);
      const page = queryGallery(rows, query, {
        nsfw,
        ...(after && { after }),
      });
      const body: GalleryResponse = {
        ...page,
        overview: galleryOverview(rows, nsfw),
        years: galleryOverview(
          rows.filter((row) => matchesQuery(row, query)),
          nsfw,
        ).years,
      };
      res.json(body);
    }),
  );

  router.get(
    '/people',
    handle(async (req, res) => {
      const overview = galleryOverview(
        await catalog.summaries.gallery(),
        nsfwFlag(req),
      );
      const names = new Map(
        (await catalog.summaries.people()).map((entry) => [entry.id, entry]),
      );
      const pick = (choices: Choice[]): PickerPerson[] =>
        choices.flatMap(({ value, count }) => {
          const entry = names.get(value);
          return entry ? [{ ...entry, count }] : [];
        });
      const body: PeopleResponse = {
        characters: pick(overview.characters),
        artists: pick(overview.artists),
      };
      res.json(body);
    }),
  );

  router.get(
    '/artworks/:id',
    handle(async (req, res) => {
      const id = String(req.params['id']);
      const image = await catalog.image(id);
      if (!image?.published) {
        res.status(404).json({ error: 'Not found.' });
        return;
      }
      const [people, rows] = await Promise.all([
        catalog.people([...image.artistIds, ...image.characterIds]),
        catalog.summaries.gallery(),
      ]);
      const credits = (ids: string[]) =>
        ids.flatMap((personId) => {
          const person = people.get(personId);
          return person ? [credited(person)] : [];
        });
      const { previous, next } = neighbours(rows, id, nsfwFlag(req));
      const body: ArtworkResponse = {
        artwork: {
          id,
          sortDate: image.sortDate,
          nsfw: image.nsfw,
          tags: image.tags,
          file: image.file,
          ...(image.title && { title: image.title }),
          ...(image.description && { description: image.description }),
          ...(image.date && { date: image.date }),
        },
        artists: credits(image.artistIds),
        characters: credits(image.characterIds),
        ...(previous && { previous: link(previous) }),
        ...(next && { next: link(next) }),
      };
      res.json(body);
    }),
  );

  router.get(
    '/home',
    handle(async (req, res) => {
      const [people, rows] = await Promise.all([
        catalog.people([TIGY_ID]),
        catalog.summaries.gallery(),
      ]);
      const tigy = people.get(TIGY_ID);
      const { count, oldest, newest, years } = galleryOverview(
        rows,
        nsfwFlag(req),
      );
      const body: HomeResponse = {
        owner: tigy
          ? {
              name: tigy.name,
              links: tigy.links,
              ...(tigy.avatar && { avatar: tigy.avatar }),
            }
          : null,
        count,
        years,
        ...(oldest && { oldest }),
        ...(newest && { newest }),
      };
      res.json(body);
    }),
  );

  router.use((_req, res) => {
    res.status(404).json({ error: 'Not found.' });
  });

  return router;
}

function nsfwFlag(req: Request): boolean {
  return req.query['nsfw'] === '1';
}

/** Tigy is credited without links; the credit leads to the home page instead. */
function credited(person: WithId<Person>): CreditedPerson {
  const base = {
    id: person.id,
    name: person.name,
    ...(person.avatar && { avatar: person.avatar }),
  };
  return person.id === TIGY_ID
    ? { ...base, links: [], own: true }
    : { ...base, links: person.links ?? [] };
}

function link(row: GalleryRow): NeighbourLink {
  return { id: row.id, ...(row.title && { title: row.title }) };
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

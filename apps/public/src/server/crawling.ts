import { Router, type Request, type Response } from 'express';
import { artworkPath } from '../app/shared/urls';
import { CDN_CACHE_CONTROL } from './cache-control';
import type { SummaryCache } from './summary-cache';

// The hosts Angular accepts too: keep in sync with `security.allowedHosts`
// in project.json, so a forged forwarded host never reaches a cached response.
const ALLOWED_HOSTS = [
  /^localhost$/,
  /^[a-z0-9-]+(\.[a-z0-9-]+)*\.hosted\.app$/,
];

/** Null when the host isn't one of the site's own. */
export function requestOrigin(req: Request): string | null {
  return ALLOWED_HOSTS.some((host) => host.test(req.hostname))
    ? `${req.protocol}://${req.host}`
    : null;
}

function unknownHost(res: Response): void {
  res.set('Cache-Control', 'no-store');
  res.status(400).type('text/plain').send('Unknown host.');
}

/** Served here, not as static files, because both name absolute addresses. */
export function crawlingRouter(summaries: SummaryCache): Router {
  const router = Router();

  router.get('/robots.txt', (req, res) => {
    const origin = requestOrigin(req);
    if (!origin) {
      unknownHost(res);
      return;
    }
    res.set('Cache-Control', CDN_CACHE_CONTROL);
    res
      .type('text/plain')
      .send(
        [
          'User-agent: *',
          'Disallow: /api/',
          '',
          `Sitemap: ${origin}/sitemap.xml`,
          '',
        ].join('\n'),
      );
  });

  router.get('/sitemap.xml', (req, res, next) => {
    const origin = requestOrigin(req);
    if (!origin) {
      unknownHost(res);
      return;
    }
    summaries
      .gallery()
      .then((rows) => {
        // The summary holds only published pieces.
        const urls = [
          `${origin}/`,
          ...rows
            .filter((row) => !row.nsfw)
            .map((row) => origin + artworkPath(row.id)),
        ];
        res.set('Cache-Control', CDN_CACHE_CONTROL);
        res
          .type('application/xml')
          .send(
            [
              '<?xml version="1.0" encoding="UTF-8"?>',
              '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
              ...urls.map((url) => `  <url><loc>${escapeXml(url)}</loc></url>`),
              '</urlset>',
              '',
            ].join('\n'),
          );
      })
      .catch((error: unknown) => {
        res.set('Cache-Control', 'no-store');
        next(error);
      });
  });

  return router;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

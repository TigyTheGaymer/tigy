import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { RenderContext } from './app/catalog/loopback-backend.service';
import { apiRouter } from './server/api';
import { firestoreCatalog, storageFiles } from './server/catalog';
import { crawlingRouter } from './server/crawling';
import { filesRouter } from './server/files';

const serverDistFolder = dirname(fileURLToPath(import.meta.url));
const browserDistFolder = resolve(serverDistFolder, '../browser');

const app = express();
// Behind App Hosting the request arrives over HTTP at the Cloud Run host, so
// only the proxy's forwarded headers name the public address. The proxy
// overwrites them, and Angular still checks the host against allowedHosts.
const angularApp = new AngularNodeAppEngine({
  trustProxyHeaders: ['x-forwarded-host', 'x-forwarded-proto'],
});
const catalog = firestoreCatalog();

// So req.protocol and req.host give the public address behind App Hosting's proxy.
app.set('trust proxy', true);

/** The data endpoints the pages read, during server rendering and in the browser. */
app.use('/api', apiRouter(catalog));

app.use(crawlingRouter(catalog.summaries));
app.use(filesRouter(storageFiles(), catalog.summaries));

app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

app.use((req, res, next) => {
  const context: RenderContext = {
    apiOrigin: `http://localhost:${req.socket.localPort}`,
  };
  angularApp
    .handle(req, context)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/** Starts the server when this module is the entry point or runs via PM2, on `PORT` or 4000. */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/** The request handler the Angular CLI (dev server and build) and Cloud Functions use. */
export const reqHandler = createNodeRequestHandler(app);

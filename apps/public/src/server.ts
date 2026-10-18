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
const angularApp = new AngularNodeAppEngine();
const catalog = firestoreCatalog();

// So req.protocol and req.host give the public address behind App Hosting's proxy.
app.set('trust proxy', true);

/**
 * The data endpoints the pages read, during server rendering and in the
 * browser (define-data-model, design D5 to D7).
 */
app.use('/api', apiRouter(catalog));

app.use(crawlingRouter(catalog.summaries));
app.use(filesRouter(storageFiles(), catalog.summaries));

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
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

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);

import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';
import { provideLoopback } from './catalog/loopback-backend.service';
import { provideServerStorage } from './shared/storage';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    provideLoopback(),
    provideServerStorage(),
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);

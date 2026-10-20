import { provideHttpClient } from '@angular/common/http';
import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import {
  provideClientHydration,
  withEventReplay,
} from '@angular/platform-browser';
import {
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
} from '@angular/router';
import { provideNgIconsConfig } from '@ng-icons/core';
import { appRoutes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    // A heavier line than Lucide's default, to match the chunky type.
    provideNgIconsConfig({ strokeWidth: 2.4 }),
    // Includes the HTTP transfer cache, so hydration reuses the server's responses.
    provideClientHydration(withEventReplay()),
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(),
    provideRouter(
      appRoutes,
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled' }),
    ),
  ],
};

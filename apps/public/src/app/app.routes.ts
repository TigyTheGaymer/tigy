import { Route } from '@angular/router';

// People and tags have no pages: people are credits, tags are filters.
export const appRoutes: Route[] = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./home/home').then((m) => m.HomePage),
  },
  {
    path: 'i/:id',
    loadComponent: () => import('./artwork/artwork').then((m) => m.ArtworkPage),
  },
  {
    path: 'privacy',
    loadComponent: () =>
      import('./privacy/privacy').then((m) => m.PrivacyPage),
  },
  {
    path: '**',
    loadComponent: () =>
      import('./not-found/not-found').then((m) => m.NotFoundPage),
  },
];

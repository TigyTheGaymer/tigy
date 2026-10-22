import type { Route } from '@angular/router';
import { ownerGuard } from './auth/owner.guard';
import { signedOutGuard } from './auth/signed-out.guard';
import { Shell } from './chrome/shell';
import { unsavedEditsGuard } from './shared/unsaved-edits.guard';
import { SignInPage } from './sign-in/sign-in';

export const appRoutes: Route[] = [
  {
    path: 'sign-in',
    canActivate: [signedOutGuard],
    component: SignInPage,
    title: 'Sign in · Tigy admin',
  },
  {
    path: '',
    canMatch: [ownerGuard],
    component: Shell,
    children: [
      {
        path: 'artworks',
        title: 'Artworks · Tigy admin',
        loadComponent: () =>
          import('./artworks/artworks').then((m) => m.ArtworksPage),
      },
      {
        path: 'artworks/:id',
        title: 'Artwork · Tigy admin',
        canDeactivate: [unsavedEditsGuard],
        loadComponent: () =>
          import('./artworks/editor/editor').then((m) => m.ArtworkEditorPage),
      },
      {
        path: 'people',
        title: 'People · Tigy admin',
        loadComponent: () =>
          import('./people/people').then((m) => m.PeoplePage),
      },
      {
        path: 'people/:id',
        title: 'Person · Tigy admin',
        canDeactivate: [unsavedEditsGuard],
        loadComponent: () =>
          import('./people/editor/person-page').then((m) => m.PersonPage),
      },
      {
        path: 'uploads',
        title: 'Uploads · Tigy admin',
        loadComponent: () =>
          import('./uploads/uploads').then((m) => m.UploadsPage),
      },
      { path: '**', redirectTo: 'artworks' },
    ],
  },
];

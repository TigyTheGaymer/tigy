import type { Route } from '@angular/router';
import { ownerGuard } from './auth/owner.guard';
import { signedOutGuard } from './auth/signed-out.guard';
import { Shell } from './chrome/shell';
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
        path: 'uploads',
        title: 'Uploads · Tigy admin',
        loadComponent: () =>
          import('./uploads/uploads').then((m) => m.UploadsPage),
      },
      { path: '**', redirectTo: 'uploads' },
    ],
  },
];

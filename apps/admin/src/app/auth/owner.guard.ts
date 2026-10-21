import { inject } from '@angular/core';
import { Router, type CanMatchFn } from '@angular/router';
import { AuthService } from './auth.service';

/** Anyone but the owner is signed out and sent to sign-in. */
export const ownerGuard: CanMatchFn = async (_route, segments) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const { user, isOwner } = await auth.whenReady();
  if (isOwner) return true;
  if (user) await auth.signOut();
  const next = '/' + segments.map((segment) => segment.path).join('/');
  return router.createUrlTree(['/sign-in'], {
    queryParams: next === '/' ? {} : { next },
  });
};

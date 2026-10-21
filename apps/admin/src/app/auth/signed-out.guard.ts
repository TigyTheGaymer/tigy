import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthService } from './auth.service';
import { nextPath } from './next-path';

/** The owner, already signed in, skips the sign-in page. */
export const signedOutGuard: CanActivateFn = async (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const { isOwner } = await auth.whenReady();
  return isOwner
    ? router.parseUrl(nextPath(route.queryParamMap.get('next')))
    : true;
};

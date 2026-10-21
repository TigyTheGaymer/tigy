import { logger } from 'firebase-functions';
import {
  beforeUserCreated,
  HttpsError,
  type AuthBlockingEvent,
} from 'firebase-functions/identity';
import { defineString } from 'firebase-functions/params';

/** Kept out of the repository: `.env.<project>` in the functions' build output. */
export const OWNER_EMAIL = defineString('OWNER_EMAIL', {
  description:
    "The owner's Google account, the only one that may sign in to the admin.",
});

export interface SignUp {
  providerId?: string;
  email?: string;
  emailVerified: boolean;
}

export type SignUpRefusal = 'other-provider' | 'unverified' | 'not-owner';

export type SignUpDecision =
  { allowed: true } | { allowed: false; reason: SignUpRefusal };

export function decideSignUp(
  signUp: SignUp,
  ownerEmail: string,
): SignUpDecision {
  if (signUp.providerId !== 'google.com') {
    return { allowed: false, reason: 'other-provider' };
  }
  if (!signUp.emailVerified) {
    return { allowed: false, reason: 'unverified' };
  }
  const owner = ownerEmail.trim().toLowerCase();
  if (!owner || signUp.email?.toLowerCase() !== owner) {
    return { allowed: false, reason: 'not-owner' };
  }
  return { allowed: true };
}

export function signUpOf(event: AuthBlockingEvent): SignUp {
  return {
    providerId: event.additionalUserInfo?.providerId,
    email: event.data?.email,
    emailVerified: event.data?.emailVerified ?? false,
  };
}

export const beforeUserCreatedBlocking = beforeUserCreated((event) => {
  const signUp = signUpOf(event);
  const decision = decideSignUp(signUp, OWNER_EMAIL.value());
  if (!decision.allowed) {
    // A mistyped OWNER_EMAIL shows up here as the owner being refused.
    logger.warn('Refused a sign-up to the admin', {
      reason: decision.reason,
      providerId: signUp.providerId,
      email: signUp.email,
    });
    throw new HttpsError('permission-denied', 'Only the owner can sign in.');
  }
  return { customClaims: { owner: true } };
});

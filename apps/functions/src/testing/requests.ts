import type { CallableRequest } from 'firebase-functions/https';

// Test helpers only; excluded from the functions build.

/** A callable request from a signed-in account with the given claims. */
export function requestFrom<T>(
  claims: Record<string, unknown> | null,
  data: T,
): CallableRequest<T> {
  return {
    data,
    rawRequest: {} as CallableRequest<T>['rawRequest'],
    acceptsStreaming: false,
    ...(claims && {
      auth: {
        uid: 'someone',
        token: claims as unknown as NonNullable<
          CallableRequest['auth']
        >['token'],
        rawToken: 'token',
      },
    }),
  };
}

export const OWNER = { owner: true };
export const NOT_OWNER = [
  ['a visitor', null],
  ['a stranger', { email: 'stranger@example.com' }],
  ['an account with owner: false', { owner: false }],
] as const;

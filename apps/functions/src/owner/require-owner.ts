import { HttpsError, type CallableRequest } from 'firebase-functions/https';

/** Refuses a callable request unless it comes from the owner: the account with the claim `owner: true`. */
export function requireOwner(request: CallableRequest<unknown>): void {
  if (request.auth?.token['owner'] !== true) {
    throw new HttpsError('permission-denied', 'Only the owner may do this.');
  }
}

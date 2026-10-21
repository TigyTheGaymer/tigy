import { TestBed } from '@angular/core/testing';
import { AUTH_API } from '../firebase/firebase';
import { AuthService, signInErrorResult } from './auth.service';
import { FakeAuthApi, NOT_OWNER, OWNER } from '../testing';

function setUp() {
  const api = new FakeAuthApi();
  TestBed.configureTestingModule({
    providers: [{ provide: AUTH_API, useValue: api }],
  });
  return { api, auth: TestBed.inject(AuthService) };
}

describe('AuthService', () => {
  it('waits for Firebase to restore the session before answering', async () => {
    const { api, auth } = setUp();
    let answered = false;
    const ready = auth.whenReady().then((state) => {
      answered = true;
      return state;
    });
    await Promise.resolve();
    expect(answered).toBe(false);

    api.emit(OWNER);
    expect(await ready).toEqual({ user: OWNER, isOwner: true });
    expect(auth.isOwner()).toBe(true);
    expect(auth.user()).toBe(OWNER);
  });

  it('knows a signed-in account without the claim is not the owner', async () => {
    const { api, auth } = setUp();
    api.emit(NOT_OWNER);
    expect(await auth.whenReady()).toEqual({ user: NOT_OWNER, isOwner: false });
  });

  it("signs in the owner's account", async () => {
    const { auth } = setUp();
    expect(await auth.signIn()).toBe('signed-in');
  });

  it('signs out and refuses an account that has no owner claim', async () => {
    const { api, auth } = setUp();
    api.signIn = async () => NOT_OWNER;
    expect(await auth.signIn()).toBe('refused');
    expect(api.signOutCount).toBe(1);
  });

  it('reports why a sign-in failed', async () => {
    const { api, auth } = setUp();
    api.signIn = () =>
      Promise.reject({
        code: 'auth/internal-error',
        message:
          'Firebase: HTTP Cloud Function returned an error: {"error":{"message":"Only the owner can sign in.","status":"PERMISSION_DENIED"}} (auth/internal-error).',
      });
    expect(await auth.signIn()).toBe('refused');
  });
});

describe('signInErrorResult', () => {
  it('treats a closed popup as cancelled, so nothing is shown', () => {
    expect(signInErrorResult({ code: 'auth/popup-closed-by-user' })).toBe(
      'cancelled',
    );
    expect(signInErrorResult({ code: 'auth/cancelled-popup-request' })).toBe(
      'cancelled',
    );
  });

  it("recognises the blocking function's refusal", () => {
    expect(
      signInErrorResult({
        code: 'auth/internal-error',
        message: 'BLOCKING_FUNCTION_ERROR_RESPONSE: ...',
      }),
    ).toBe('refused');
  });

  it('reports anything else as failed', () => {
    expect(signInErrorResult({ code: 'auth/network-request-failed' })).toBe(
      'failed',
    );
    expect(signInErrorResult(undefined)).toBe('failed');
  });
});

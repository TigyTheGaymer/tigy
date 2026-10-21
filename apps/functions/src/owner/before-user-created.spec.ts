import { decideSignUp, signUpOf } from './before-user-created';
import type { AuthBlockingEvent } from 'firebase-functions/identity';

const OWNER = 'owner@tigy.test';
const google = { providerId: 'google.com', emailVerified: true };

describe('decideSignUp', () => {
  it("allows the owner's Google account, whatever the case of its email", () => {
    expect(decideSignUp({ ...google, email: OWNER }, OWNER)).toEqual({
      allowed: true,
    });
    expect(
      decideSignUp({ ...google, email: 'Owner@Tigy.TEST' }, OWNER),
    ).toEqual({
      allowed: true,
    });
  });

  it('refuses another email', () => {
    expect(
      decideSignUp({ ...google, email: 'stranger@example.com' }, OWNER),
    ).toEqual({
      allowed: false,
      reason: 'not-owner',
    });
  });

  it("refuses the owner's email while it is unverified", () => {
    expect(
      decideSignUp({ ...google, email: OWNER, emailVerified: false }, OWNER),
    ).toEqual({ allowed: false, reason: 'unverified' });
  });

  it("refuses another provider, even with the owner's email", () => {
    expect(
      decideSignUp({ ...google, providerId: 'password', email: OWNER }, OWNER),
    ).toEqual({ allowed: false, reason: 'other-provider' });
    expect(
      decideSignUp({ ...google, providerId: undefined, email: OWNER }, OWNER),
    ).toEqual({ allowed: false, reason: 'other-provider' });
  });

  it('refuses everyone when the owner email is not set', () => {
    expect(decideSignUp({ ...google, email: '' }, '')).toEqual({
      allowed: false,
      reason: 'not-owner',
    });
    expect(decideSignUp({ ...google, email: undefined }, ' ')).toEqual({
      allowed: false,
      reason: 'not-owner',
    });
  });
});

describe('signUpOf', () => {
  it('reads the provider and email from the blocking event', () => {
    const event = {
      additionalUserInfo: { providerId: 'google.com', isNewUser: true },
      data: { email: OWNER, emailVerified: true },
    } as unknown as AuthBlockingEvent;
    expect(signUpOf(event)).toEqual({
      providerId: 'google.com',
      email: OWNER,
      emailVerified: true,
    });
  });

  it('treats a missing user as unverified', () => {
    expect(signUpOf({} as AuthBlockingEvent)).toEqual({
      providerId: undefined,
      email: undefined,
      emailVerified: false,
    });
  });
});

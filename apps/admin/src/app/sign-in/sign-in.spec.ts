import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { FakeAuthApi, NOT_OWNER } from '../testing';
import { AUTH_API } from '../firebase/firebase';
import { SignInPage } from './sign-in';

async function open(url = '/sign-in?next=%2Fuploads') {
  const api = new FakeAuthApi();
  TestBed.configureTestingModule({
    providers: [
      { provide: AUTH_API, useValue: api },
      provideRouter([
        { path: 'sign-in', component: SignInPage },
        { path: 'uploads', children: [] },
      ]),
    ],
  });
  api.emit(null);
  const harness = await RouterTestingHarness.create(url);
  const page = () => harness.routeNativeElement as HTMLElement;
  const signIn = async () => {
    page().querySelector('button')?.click();
    await harness.fixture.whenStable();
  };
  return { api, harness, page, signIn };
}

const path = () => TestBed.inject(Router).url;

describe('SignInPage', () => {
  it('Owner signs in: opens the address that was asked for', async () => {
    const { signIn } = await open();
    await signIn();
    expect(path()).toBe('/uploads');
  });

  it('Stranger signs in: says only the owner can sign in', async () => {
    const { api, page, signIn } = await open();
    api.signIn = async () => NOT_OWNER;
    await signIn();
    expect(page().querySelector('[role=alert]')?.textContent).toContain(
      'Only the owner can sign in.',
    );
    expect(path()).toBe('/sign-in?next=%2Fuploads');
  });

  it('says nothing when the popup is closed', async () => {
    const { api, page, signIn } = await open();
    api.signIn = () => Promise.reject({ code: 'auth/popup-closed-by-user' });
    await signIn();
    expect(page().querySelector('[role=alert]')).toBeNull();
  });

  it('never leaves the admin after signing in', async () => {
    const { signIn } = await open('/sign-in?next=https:%2F%2Fevil.example');
    await signIn();
    expect(path()).toBe('/uploads');
  });
});

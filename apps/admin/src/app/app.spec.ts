import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { appRoutes } from './app.routes';
import { FakeAuthApi, OWNER } from './testing';
import { AUTH_API } from './firebase/firebase';

async function open(url: string, signedIn: typeof OWNER | null) {
  const api = new FakeAuthApi();
  TestBed.configureTestingModule({
    providers: [{ provide: AUTH_API, useValue: api }, provideRouter(appRoutes)],
  });
  api.emit(signedIn);
  const harness = await RouterTestingHarness.create(url);
  return { api, harness };
}

const path = () => TestBed.inject(Router).url;

describe('admin routes', () => {
  it('sends a signed-out visitor to sign-in', async () => {
    await open('/uploads', null);
    expect(path()).toBe('/sign-in?next=%2Fuploads');
  });

  it('Unknown admin address: shows the Uploads page to the owner', async () => {
    await open('/no-such-page', OWNER);
    expect(path()).toBe('/uploads');
  });

  it('sends the owner past sign-in to the address asked for', async () => {
    await open('/sign-in?next=%2Fuploads', OWNER);
    expect(path()).toBe('/uploads');
  });

  it('opens the Uploads page at the root', async () => {
    await open('/', OWNER);
    expect(path()).toBe('/uploads');
  });
});

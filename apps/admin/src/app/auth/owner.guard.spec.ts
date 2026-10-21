import { TestBed } from '@angular/core/testing';
import {
  provideRouter,
  Router,
  UrlSegment,
  UrlTree,
  type Route,
} from '@angular/router';
import { AUTH_API } from '../firebase/firebase';
import { FakeAuthApi, NOT_OWNER, OWNER } from '../testing';
import { ownerGuard } from './owner.guard';

function check(path: string, signedIn: typeof OWNER | null) {
  const api = new FakeAuthApi();
  TestBed.configureTestingModule({
    providers: [{ provide: AUTH_API, useValue: api }, provideRouter([])],
  });
  api.emit(signedIn);
  const segments = path
    .split('/')
    .filter(Boolean)
    .map((part) => new UrlSegment(part, {}));
  const result = TestBed.runInInjectionContext(() =>
    ownerGuard({} as Route, segments, {} as never),
  ) as Promise<boolean | UrlTree>;
  return { api, result };
}

const url = (tree: boolean | UrlTree) =>
  TestBed.inject(Router).serializeUrl(tree as UrlTree);

describe('ownerGuard', () => {
  it('lets the owner in', async () => {
    expect(await check('/uploads', OWNER).result).toBe(true);
  });

  it('Signed-out link to the Uploads page: sends a visitor to sign-in, remembering the address', async () => {
    expect(url(await check('/uploads', null).result)).toBe(
      '/sign-in?next=%2Fuploads',
    );
  });

  it('signs out an account without the owner claim before sending it to sign-in', async () => {
    const { api, result } = check('/uploads', NOT_OWNER);
    expect(url(await result)).toBe('/sign-in?next=%2Fuploads');
    expect(api.signOutCount).toBe(1);
  });

  it('asks for no address when the admin root was opened', async () => {
    expect(url(await check('/', null).result)).toBe('/sign-in');
  });
});

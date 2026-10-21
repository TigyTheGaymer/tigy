import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { FakeAuthApi, OWNER } from '../testing';
import { AUTH_API } from '../firebase/firebase';
import { TopBar } from './top-bar';

describe('TopBar', () => {
  it('Signing out: signs out and shows the sign-in page in place of the current one', async () => {
    const api = new FakeAuthApi();
    TestBed.configureTestingModule({
      providers: [
        { provide: AUTH_API, useValue: api },
        provideRouter([
          { path: 'uploads', component: TopBar },
          { path: 'sign-in', children: [] },
        ]),
      ],
    });
    api.emit(OWNER);
    const harness = await RouterTestingHarness.create('/uploads');
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigateByUrl');

    const bar = harness.routeNativeElement as HTMLElement;
    (bar.querySelector('button[aria-label=Account]') as HTMLElement).click();
    await harness.fixture.whenStable();
    const signOut = [
      ...document.querySelectorAll('[hlmDropdownMenuItem]'),
    ].find((item) => item.textContent?.includes('Sign out')) as HTMLElement;
    signOut.click();
    await harness.fixture.whenStable();

    expect(api.signOutCount).toBe(1);
    expect(navigate).toHaveBeenCalledWith('/sign-in', { replaceUrl: true });
    expect(router.url).toBe('/sign-in');
  });

  it("shows the signed-in account's initial", async () => {
    const api = new FakeAuthApi();
    TestBed.configureTestingModule({
      providers: [{ provide: AUTH_API, useValue: api }, provideRouter([])],
    });
    api.emit(OWNER);
    await Promise.resolve();
    const fixture = TestBed.createComponent(TopBar);
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('T');
    expect(fixture.nativeElement.textContent).toContain('Tigy admin');
  });
});

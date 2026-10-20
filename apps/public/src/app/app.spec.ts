import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { RESPONSE_INIT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { CDN_CACHE_CONTROL } from '../server/cache-control';
import { appRoutes } from './app.routes';
import { serverRoutes } from './app.routes.server';
import { TopBar } from './chrome/top-bar';
import { NotFoundPage } from './not-found/not-found';

describe('TopBar', () => {
  it('offers the logo, the theme button and the NSFW switch, off by default', async () => {
    TestBed.configureTestingModule({
      imports: [TopBar],
      providers: [provideRouter([])],
    });
    const fixture = TestBed.createComponent(TopBar);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.logo')?.getAttribute('href')).toBe('/');
    expect(
      element.querySelector('.theme-btn')?.getAttribute('aria-label'),
    ).toContain('Theme: Automatic');
    const toggle = element.querySelector<HTMLInputElement>(
      '.switch input[role="switch"]',
    );
    expect(element.querySelector('.switch')?.textContent).toContain(
      'Show NSFW',
    );
    expect(toggle?.checked).toBe(false);
  });
});

describe('routes', () => {
  let response: ResponseInit;

  beforeEach(() => {
    response = {};
    TestBed.configureTestingModule({
      providers: [
        provideRouter(appRoutes),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: RESPONSE_INIT, useValue: response },
      ],
    });
  });

  it.each(['/no-such-page', '/p/tigy', '/tags/comic'])(
    'Unknown address: %s renders the not-found page with 404 and a link home',
    async (url) => {
      const harness = await RouterTestingHarness.create();
      const page = await harness.navigateByUrl(url, NotFoundPage);
      expect(page).toBeInstanceOf(NotFoundPage);
      expect(response.status).toBe(404);
      const home = harness.routeNativeElement?.querySelector('.stage-panel a');
      expect(home?.getAttribute('href')).toBe('/');
    },
  );

  it('names no route title, so every page keeps the title "Tigy"', () => {
    const titled = (routes: typeof appRoutes): boolean =>
      routes.some((route) => route.title || titled(route.children ?? []));
    expect(titled(appRoutes)).toBe(false);
  });

  it('Cache header on a page: lets the CDN keep every page for 5 minutes', () => {
    expect(serverRoutes).toEqual([
      expect.objectContaining({
        path: '**',
        headers: { 'Cache-Control': CDN_CACHE_CONTROL },
      }),
    ]);
    expect(CDN_CACHE_CONTROL).toBe('public, max-age=0, s-maxage=300');
  });
});

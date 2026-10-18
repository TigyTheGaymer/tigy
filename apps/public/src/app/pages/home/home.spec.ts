import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { RESPONSE_INIT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  provideRouter,
  Router,
  withComponentInputBinding,
} from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { appRoutes } from '../../app.routes';
import { galleryPage, HOME, requested, rows, settled } from '../../testing';

describe('HomePage', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;
  let response: ResponseInit;

  beforeEach(async () => {
    sessionStorage.clear();
    localStorage.clear();
    response = {};
    TestBed.configureTestingModule({
      providers: [
        { provide: RESPONSE_INIT, useValue: response },
        provideRouter(appRoutes, withComponentInputBinding()),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => http.verify());

  const page = () => harness.routeNativeElement as HTMLElement;
  const text = (selector: string) =>
    page().querySelector(selector)?.textContent?.trim();
  const tiles = () =>
    [...page().querySelectorAll<HTMLAnchorElement>('.tile a')].map((a) =>
      a.getAttribute('href'),
    );

  async function open(url: string): Promise<void> {
    void harness.navigateByUrl(url);
  }

  it('Visitor opens the home page: shows the header and the first page of tiles', async () => {
    await open('/');
    (await requested(http, '/api/home')).flush(HOME);
    (await requested(http, '/api/gallery')).flush(
      galleryPage(rows(24), true, 30),
    );
    await settled();

    expect(text('h1')).toBe('Tigy');
    expect(page().querySelector('.avatar')?.getAttribute('src')).toBe(
      '/avatars/tigy.webp',
    );
    expect(
      [...page().querySelectorAll('.social a')].map((a) =>
        a.getAttribute('href'),
      ),
    ).toEqual(['https://bsky.app/profile/tigy']);
    expect(text('.overview')).toBe('30 pieces · Nov 2025 – Apr 2026');
    expect(tiles()).toHaveLength(24);
    expect(tiles()[0]).toBe('/i/p01');
    const thumb = page().querySelector('.tile img')!;
    expect(thumb.getAttribute('src')).toBe('/img/p01/thumb.webp');
    expect(thumb.getAttribute('width')).toBe('400');
    expect(thumb.getAttribute('height')).toBe('300');
    expect(thumb.getAttribute('alt')).toBe('Piece 1');
  });

  it("shows just the name Tigy without Tigy's person", async () => {
    await open('/');
    (await requested(http, '/api/home')).flush({ ...HOME, owner: null });
    (await requested(http, '/api/gallery')).flush(galleryPage(rows(2), false));
    await settled();

    expect(text('h1')).toBe('Tigy');
    expect(page().querySelector('.avatar')).toBeNull();
    expect(page().querySelector('.social')).toBeNull();
  });

  it('No art yet: leaves out the count and date range and says so', async () => {
    await open('/');
    (await requested(http, '/api/home')).flush({
      owner: HOME.owner,
      count: 0,
      years: [],
    });
    (await requested(http, '/api/gallery')).flush(galleryPage([], false));
    await settled();

    expect(page().querySelector('.overview')).toBeNull();
    expect(text('.gallery')).toBe('No art yet.');
    expect(page().querySelector('.load-more')).toBeNull();
  });

  it('Loading more: appends the next page after the last piece and says the end is reached', async () => {
    await open('/?tag=comic');
    (await requested(http, '/api/home')).flush(HOME);
    (await requested(http, '/api/gallery?tag=comic')).flush(
      galleryPage(rows(24), true, 30),
    );
    await settled();
    expect(text('.end')).toBeUndefined();

    page().querySelector<HTMLButtonElement>('.load-more')!.click();
    const last = rows(24)[23];
    (
      await requested(
        http,
        `/api/gallery?tag=comic&after=${last.sortDate}_${last.id}`,
      )
    ).flush(galleryPage(rows(6, 25), false, 30));
    await settled();

    expect(tiles()).toHaveLength(30);
    expect(tiles()[24]).toBe('/i/p25');
    expect(page().querySelector('.load-more')).toBeNull();
    expect(text('.end')).toBe("That's every piece.");
    // Only the filters, so the link stays shareable.
    expect(TestBed.inject(Router).url).toBe('/?tag=comic');
  });

  it('Shared filtered link: names the person, the tag and the sort as active', async () => {
    await open('/?character=tigy&tag=comic&sort=oldest');
    (await requested(http, '/api/home')).flush(HOME);
    (
      await requested(http, '/api/gallery?character=tigy&tag=comic&sort=oldest')
    ).flush(galleryPage(rows(3), false));
    (await requested(http, '/api/people')).flush({
      characters: [{ id: 'tigy', name: 'Tigy', count: 3 }],
      artists: [],
    });
    await settled();

    const filters = [
      ...page().querySelectorAll<HTMLAnchorElement>('.active-filters a'),
    ];
    expect(filters.map((a) => a.textContent?.trim())).toEqual([
      'Character: Tigy ×',
      'Tag: comic ×',
    ]);
    expect(filters.map((a) => a.getAttribute('href'))).toEqual([
      '/?tag=comic&sort=oldest',
      '/?character=tigy&sort=oldest',
    ]);
    expect(text('.sort strong')).toBe('Oldest first');
    expect(page().querySelector('.sort a')?.getAttribute('href')).toBe(
      '/?character=tigy&tag=comic',
    );
  });

  it('Unknown person: names the filter "Unknown person", says nothing matches and offers to clear', async () => {
    await open('/?artist=nobody');
    (await requested(http, '/api/home')).flush(HOME);
    (await requested(http, '/api/gallery?artist=nobody')).flush(
      galleryPage([], false, 30),
    );
    (await requested(http, '/api/people')).flush({
      characters: [],
      artists: [],
    });
    await settled();

    const filter =
      page().querySelector<HTMLAnchorElement>('.active-filters a')!;
    expect(filter.textContent?.trim()).toBe('Artist: Unknown person ×');
    expect(filter.getAttribute('href')).toBe('/');
    expect(text('.empty')).toContain('Nothing matches these filters.');
    expect(page().querySelector('.empty a')?.getAttribute('href')).toBe('/');
  });

  it('a failed gallery read is sent as 503 and not cached', async () => {
    await open('/');
    (await requested(http, '/api/home')).flush(HOME);
    (await requested(http, '/api/gallery')).flush(null, {
      status: 500,
      statusText: 'Server Error',
    });
    await settled();
    expect(text('.gallery')).toBe('Could not load the gallery.');
    expect(response.status).toBe(503);
    expect(new Headers(response.headers).get('cache-control')).toBe('no-store');
  });

  it('reads the people only when a person filter is active', async () => {
    await open('/?tag=comic&year=2025');
    (await requested(http, '/api/home')).flush(HOME);
    (await requested(http, '/api/gallery?tag=comic&year=2025')).flush(
      galleryPage(rows(1), false),
    );
    await settled();

    expect(http.match('/api/people')).toEqual([]);
    expect(
      [...page().querySelectorAll('.active-filters a')].map((a) =>
        a.textContent?.trim(),
      ),
    ).toEqual(['Tag: comic ×', 'Year: 2025 ×']);
  });

  it('remembers its address in this tab for the link back', async () => {
    await open('/?character=tigy&sort=oldest');
    (await requested(http, '/api/home')).flush(HOME);
    (await requested(http, '/api/gallery?character=tigy&sort=oldest')).flush(
      galleryPage(rows(1), false),
    );
    (await requested(http, '/api/people')).flush({
      characters: [],
      artists: [],
    });
    await settled();

    expect(sessionStorage.getItem('tigy.gallery')).toBe(
      '/?character=tigy&sort=oldest',
    );
  });
});

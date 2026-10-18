import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ApplicationRef, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { UNFILTERED_QUERY } from '@tigy/gallery';
import { CatalogService, isNotFound } from './catalog.service';

describe('CatalogService', () => {
  let catalog: CatalogService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    catalog = TestBed.inject(CatalogService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function create<T>(make: () => T): T {
    const resource = TestBed.runInInjectionContext(make);
    TestBed.tick();
    return resource;
  }

  async function settled(): Promise<void> {
    TestBed.tick();
    await TestBed.inject(ApplicationRef).whenStable();
  }

  it('asks for the first gallery page with the filters and sort, and no NSFW flag', () => {
    create(() =>
      catalog.gallery(() => ({
        query: {
          ...UNFILTERED_QUERY,
          characterIds: ['tigy'],
          tags: ['comic', 'couple'],
          sort: 'oldest',
        },
        includeNsfw: false,
      })),
    );
    const request = http.expectOne((req) => req.url === '/api/gallery');
    expect(request.request.params.getAll('character')).toEqual(['tigy']);
    expect(request.request.params.getAll('tag')).toEqual(['comic', 'couple']);
    expect(request.request.params.get('sort')).toBe('oldest');
    expect(request.request.params.has('nsfw')).toBe(false);
    expect(request.request.params.has('after')).toBe(false);
    request.flush({ rows: [], hasMore: false });
  });

  it('asks for the next page after a piece, with the NSFW flag when the switch is on', () => {
    create(() =>
      catalog.gallery(() => ({
        query: UNFILTERED_QUERY,
        includeNsfw: true,
        after: { sortDate: '2025-01-07', id: 'p07' },
      })),
    );
    const request = http.expectOne((req) => req.url === '/api/gallery');
    expect(request.request.params.get('after')).toBe('2025-01-07_p07');
    expect(request.request.params.get('nsfw')).toBe('1');
    request.flush({ rows: [], hasMore: false });
  });

  it('stays idle while the request is undefined, and loads once it is set', () => {
    const include = signal<boolean | undefined>(undefined);
    create(() => catalog.people(include));
    http.expectNone('/api/people');

    include.set(true);
    TestBed.tick();
    http.expectOne('/api/people?nsfw=1').flush({ characters: [], artists: [] });
  });

  it('reads the home header and an artwork, and reloads when a signal changes', () => {
    const includeNsfw = signal(false);
    create(() => catalog.home(includeNsfw));
    create(() => catalog.artwork(() => ({ id: 'k3x', includeNsfw: false })));
    http.expectOne('/api/home').flush({ owner: null, count: 0, years: [] });
    http.expectOne('/api/artworks/k3x').flush({});

    includeNsfw.set(true);
    TestBed.tick();
    http
      .expectOne('/api/home?nsfw=1')
      .flush({ owner: null, count: 0, years: [] });
  });

  it('recognises an artwork that is not found', async () => {
    const artwork = create(() =>
      catalog.artwork(() => ({ id: 'draft', includeNsfw: false })),
    );
    http
      .expectOne('/api/artworks/draft')
      .flush({ error: 'Not found.' }, { status: 404, statusText: 'Not Found' });
    await settled();
    expect(isNotFound(artwork.error())).toBe(true);
  });

  it('does not take any other failure for not found', async () => {
    const artwork = create(() =>
      catalog.artwork(() => ({ id: 'k3x', includeNsfw: false })),
    );
    http
      .expectOne('/api/artworks/k3x')
      .flush(null, { status: 500, statusText: 'Server Error' });
    await settled();
    expect(artwork.error()).toBeDefined();
    expect(isNotFound(artwork.error())).toBe(false);
  });
});

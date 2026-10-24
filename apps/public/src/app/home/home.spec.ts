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
import { appRoutes } from '../app.routes';
import { galleryPage, HOME, requested, row, rows, settled } from '../testing';

/** Stands in for the browser's IntersectionObserver, which jsdom lacks. */
let setNearEnd: (isNear: boolean) => void = () => undefined;
class FakeIntersectionObserver {
  constructor(callback: (entries: { isIntersecting: boolean }[]) => void) {
    setNearEnd = (isNear) => callback([{ isIntersecting: isNear }]);
  }
  readonly observe = vi.fn();
  readonly unobserve = vi.fn();
  readonly disconnect = vi.fn();
}

describe('HomePage', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;
  let response: ResponseInit;

  beforeEach(async () => {
    sessionStorage.clear();
    localStorage.clear();
    vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
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

  afterEach(() => {
    http.verify();
    vi.unstubAllGlobals();
  });

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

  const pickers = () => [
    ...page().querySelectorAll<HTMLButtonElement>('.pickers button.chip'),
  ];
  const pickerLabels = () =>
    pickers().map((b) => b.textContent?.replace(/\s+/g, ' ').trim());

  /** jsdom has no showModal() or matchMedia(). */
  function stubDialogs(): void {
    const { showModal } = HTMLDialogElement.prototype;
    HTMLDialogElement.prototype.showModal = function () {
      this.setAttribute('open', '');
    };
    onTestFinished(() => {
      HTMLDialogElement.prototype.showModal = showModal;
      vi.unstubAllGlobals();
    });
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
  }

  it('Visitor opens the home page: shows the header and the first page of tiles', async () => {
    await open('/');
    (await requested(http, '/api/home')).flush(HOME);
    (await requested(http, '/api/gallery')).flush(
      galleryPage(rows(24), true, 30),
    );
    await settled();

    expect(text('h1')).toBe('Tigy');
    expect(text('.bio')).toBe('A tiger');
    expect(page().querySelector('.avatar')?.getAttribute('src')).toBe(
      '/avatars/tigy.webp',
    );
    expect(
      [...page().querySelectorAll('.socials a')].map((a) => [
        a.getAttribute('href'),
        a.getAttribute('aria-label'),
      ]),
    ).toEqual([['https://bsky.app/profile/tigy', 'Bluesky: tigy']]);
    expect(text('.overview')).toBe('30 pieces · Nov 2025 – Apr 2026');
    expect(tiles()).toHaveLength(24);
    expect(tiles()[0]).toBe('/i/p01');
    const thumb = page().querySelector('.tile img')!;
    expect(thumb.getAttribute('src')).toBe('/img/p01/thumb.webp');
    expect(thumb.getAttribute('width')).toBe('400');
    expect(thumb.getAttribute('height')).toBe('300');
    expect(page().querySelector('.tile a')?.getAttribute('aria-label')).toBe(
      'Piece 1',
    );
  });

  it('Untitled piece: its tile shows no label but is still named "Untitled"', async () => {
    await open('/');
    (await requested(http, '/api/home')).flush(HOME);
    (await requested(http, '/api/gallery')).flush(
      galleryPage([row('p01', { title: 'Hey Pookie!' }), row('p02')], false),
    );
    await settled();

    const [titled, untitled] = page().querySelectorAll('.tile a');
    expect(titled.querySelector('.label')?.textContent?.trim()).toBe(
      'Hey Pookie!',
    );
    expect(untitled.querySelector('.label')).toBeNull();
    expect(untitled.getAttribute('aria-label')).toBe('Untitled');
  });

  it("shows just the name Tigy without Tigy's person", async () => {
    await open('/');
    (await requested(http, '/api/home')).flush({ ...HOME, owner: null });
    (await requested(http, '/api/gallery')).flush(galleryPage(rows(2), false));
    await settled();

    expect(text('h1')).toBe('Tigy');
    expect(page().querySelector('.avatar')).toBeNull();
    expect(page().querySelector('.socials')).toBeNull();
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
    expect(text('.empty')).toBe('No art yet.');
    expect(text('.end')).toBeUndefined();
  });

  it('Loading more: scrolling near the end appends the next page and says the end is reached', async () => {
    await open('/?tag=comic');
    (await requested(http, '/api/home')).flush(HOME);
    (await requested(http, '/api/gallery?tag=comic')).flush(
      galleryPage(rows(24), true, 30),
    );
    await settled();
    expect(text('.end')).toBeUndefined();

    setNearEnd(true);
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

    expect(pickerLabels()).toEqual([
      'Characters · 1',
      'Artists',
      'Tags · 1',
      'Year',
    ]);
    const [characters, artists] = pickers();
    expect(characters.getAttribute('aria-label')).toBe(
      'Characters, 1 selected',
    );
    expect(characters.classList).toContain('is-active');
    expect(artists.classList).not.toContain('is-active');
    expect(pickers().some((b) => b.hasAttribute('aria-disabled'))).toBe(false);
    expect(page().textContent).not.toContain('coming later');
    const sort = page().querySelector('.chip.sort')!;
    expect(sort.textContent?.trim()).toBe('Oldest first');
    expect(sort.getAttribute('href')).toBe('/?character=tigy&tag=comic');
    expect(page().querySelector('.chip.clear')?.getAttribute('href')).toBe(
      '/?sort=oldest',
    );
  });

  it('offers no "Clear all" without filters', async () => {
    await open('/');
    (await requested(http, '/api/home')).flush(HOME);
    (await requested(http, '/api/gallery')).flush(galleryPage(rows(3), false));
    await settled();
    expect(pickerLabels()).toEqual(['Characters', 'Artists', 'Tags', 'Year']);
    expect(page().querySelector('.chip.clear')).toBeNull();
  });

  it('Picking a tag: the picker offers the first page’s choices, each linking to the gallery with it added', async () => {
    stubDialogs();
    await open('/?character=tigy');
    (await requested(http, '/api/home')).flush(HOME);
    (await requested(http, '/api/gallery?character=tigy')).flush({
      ...galleryPage(rows(3), false),
      choices: {
        characters: [{ id: 'tigy', name: 'Tigy', count: 3 }],
        artists: [],
        tags: [{ value: 'comic', count: 2 }],
        years: [],
      },
    });
    await settled();

    // The choices already name Tigy.
    expect(http.match('/api/people')).toEqual([]);
    pickers()[2].click();
    await settled();

    const choice = page().querySelector<HTMLAnchorElement>('dialog .choice')!;
    expect(choice.getAttribute('aria-label')).toBe('comic, 2 pieces');
    expect(choice.getAttribute('href')).toBe('/?character=tigy&tag=comic');
  });

  it('Unknown person: lists the filter as "Unknown person" to unpick, says nothing matches and offers to clear', async () => {
    stubDialogs();
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

    expect(pickerLabels()[1]).toBe('Artists · 1');
    pickers()[1].click();
    await settled();
    const choice = page().querySelector<HTMLAnchorElement>('dialog .choice')!;
    expect(choice.getAttribute('aria-label')).toBe(
      'Unknown person, 0 pieces, selected',
    );
    expect(choice.getAttribute('href')).toBe('/');
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
    expect(text('.error')).toBe('Could not load the gallery.');
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
    expect(pickerLabels()).toEqual([
      'Characters',
      'Artists',
      'Tags · 1',
      'Year · 1',
    ]);
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

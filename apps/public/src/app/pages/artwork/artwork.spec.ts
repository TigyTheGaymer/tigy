import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { RESPONSE_INIT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { appRoutes } from '../../app.routes';
import { NsfwSwitchService } from '../../nsfw/nsfw-switch.service';
import { artwork, requested, settled } from '../../testing';

describe('ArtworkPage', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;
  let response: ResponseInit;

  beforeEach(async () => {
    sessionStorage.clear();
    localStorage.clear();
    response = {};
    TestBed.configureTestingModule({
      providers: [
        provideRouter(appRoutes, withComponentInputBinding()),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: RESPONSE_INIT, useValue: response },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => http.verify());

  const page = () => harness.routeNativeElement as HTMLElement;
  const text = (selector: string) =>
    page().querySelector(selector)?.textContent?.trim().replace(/\s+/g, ' ');
  const hrefs = (selector: string) =>
    [...page().querySelectorAll(selector)].map((a) => a.getAttribute('href'));

  async function open(url: string, id: string) {
    void harness.navigateByUrl(url);
    return requested(http, `/api/artworks/${id}`);
  }

  it('Piece with every field: shows the image, details, credits, tags, file, neighbours and the link back', async () => {
    (await open('/i/hey-pookie', 'hey-pookie')).flush(
      artwork(
        {
          title: 'Hey Pookie!',
          description: 'A three-panel comic.',
          date: '2026-02-14',
          tags: ['comic', 'couple'],
        },
        {
          artists: [
            {
              id: 'ann',
              name: 'Ann',
              links: [
                { network: 'twitter', handle: 'ann', url: 'https://x.com/ann' },
              ],
            },
            { id: 'bob', name: 'Bob', links: [] },
          ],
          characters: [
            { id: 'tigy', name: 'Tigy', links: [], own: true },
            { id: 'pookie', name: 'Pookie', links: [] },
          ],
          previous: { id: 'ref-sheet', title: 'Tigy reference sheet' },
          next: { id: 'chibi-tigy' },
        },
      ),
    );
    await settled();

    const image = page().querySelector('img.piece')!;
    expect(image.getAttribute('src')).toBe('/img/hey-pookie/full.webp');
    expect(image.getAttribute('width')).toBe('1620');
    expect(text('h1')).toBe('Hey Pookie!');
    expect(text('.description')).toBe('A three-panel comic.');
    expect(text('.date')).toBe('14 Feb 2026');
    // Tigy's credit leads home, without links.
    expect(hrefs('.artists > ul > li > a')).toEqual([
      '/?artist=ann',
      '/?artist=bob',
    ]);
    expect(hrefs('.characters > ul > li > a')).toEqual([
      '/',
      '/?character=pookie',
    ]);
    expect(hrefs('.artists .links a')).toEqual(['https://x.com/ann']);
    expect(page().querySelector('.characters .links')).toBeNull();
    expect(hrefs('.tags a')).toEqual(['/?tag=comic', '/?tag=couple']);
    expect(text('.file p')).toBe('PNG · 1620 × 2117 px · 3.7 MB');
    expect(hrefs('.download')).toEqual(['/img/hey-pookie/original.png']);
    expect(page().querySelector('.download')?.hasAttribute('download')).toBe(
      true,
    );
    expect(text('.previous')).toBe('Previous: Tigy reference sheet');
    expect(hrefs('.previous')).toEqual(['/i/ref-sheet']);
    expect(text('.next')).toBe('Next: Untitled');
    expect(hrefs('.back')).toEqual(['/']);
    expect(page().querySelector('.confirm')).toBeNull();
    expect(page().querySelector('.share')).toBeNull();
  });

  it('Year only: shows just the year', async () => {
    (await open('/i/old', 'old')).flush(artwork({ id: 'old', date: '2019' }));
    await settled();
    expect(text('.date')).toBe('2019');
  });

  it('Piece without credits: shows "Untitled" and neither credits section', async () => {
    (await open('/i/chibi-tigy', 'chibi-tigy')).flush(
      artwork({ id: 'chibi-tigy' }),
    );
    await settled();
    expect(text('h1')).toBe('Untitled');
    expect(page().querySelector('.credits')).toBeNull();
    expect(page().querySelector('.tags')).toBeNull();
    expect(page().querySelector('.date')).toBeNull();
    expect(page().querySelector('.description')).toBeNull();
  });

  it('Unpublished artwork link: renders the not-found page with 404', async () => {
    (await open('/i/draft', 'draft')).flush(
      { error: 'Not found.' },
      { status: 404, statusText: 'Not Found' },
    );
    await settled();
    expect(text('h1')).toBe('Not found');
    expect(response.status).toBe(404);
  });

  it('a failed read is sent as 503 and not cached', async () => {
    response.headers = new Headers({ 'Cache-Control': 'public, s-maxage=300' });
    (await open('/i/k3x', 'k3x')).flush(null, {
      status: 500,
      statusText: 'Server Error',
    });
    await settled();
    expect(text('.error')).toBe('Could not load this piece.');
    expect(response.status).toBe(503);
    expect(new Headers(response.headers).get('cache-control')).toBe('no-store');
  });

  it('An NSFW piece with the switch off: shows its details behind the confirm screen, without the image', async () => {
    (await open('/i/lewd', 'lewd')).flush(
      artwork({ id: 'lewd', nsfw: true, title: 'Lewd' }),
    );
    await settled();

    expect(page().querySelector('img')).toBeNull();
    expect(text('.confirm')).toContain('Show this piece');
    expect(text('h1')).toBe('Lewd');
    expect(hrefs('.share a')).toEqual([
      `${location.origin}/i/lewd`,
      `${location.origin}/i/lewd?safe`,
    ]);

    page().querySelector<HTMLButtonElement>('.confirm button')!.click();
    await settled();
    expect(page().querySelector('img.piece')?.getAttribute('src')).toBe(
      '/img/lewd/full.webp',
    );
    expect(TestBed.inject(NsfwSwitchService).isOn()).toBe(false);
    expect(JSON.parse(sessionStorage.getItem('tigy.nsfw.confirmed')!)).toEqual([
      'lewd',
    ]);
  });

  it('"Show NSFW everywhere" turns the switch on and swaps in the NSFW-inclusive neighbours', async () => {
    (await open('/i/lewd', 'lewd')).flush(
      artwork({ id: 'lewd', nsfw: true }, { next: { id: 'sfw' } }),
    );
    await settled();

    page().querySelectorAll<HTMLButtonElement>('.confirm button')[1].click();
    await settled();
    expect(TestBed.inject(NsfwSwitchService).isOn()).toBe(true);
    // The details stay while the neighbours load.
    expect(page().querySelector('img.piece')).not.toBeNull();
    (await requested(http, '/api/artworks/lewd?nsfw=1')).flush(
      artwork({ id: 'lewd', nsfw: true }, { next: { id: 'other-lewd' } }),
    );
    await settled();
    expect(hrefs('.next')).toEqual(['/i/other-lewd']);
  });

  it('Back to a filtered gallery: links to the gallery this tab came from', async () => {
    sessionStorage.setItem('tigy.gallery', '/?character=pookie');
    (await open('/i/hey-pookie', 'hey-pookie')).flush(artwork());
    await settled();
    expect(hrefs('.back')).toEqual(['/?character=pookie']);
  });
});

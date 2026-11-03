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
import { StageBar } from '../chrome/stage-bar';
import { AgeCheckService } from '../nsfw/age-check.service';
import { NsfwSwitchService } from '../nsfw/nsfw-switch.service';
import { artwork, requested, settled } from '../testing';

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

  afterEach(() => {
    http.verify();
    vi.unstubAllGlobals();
  });

  const page = () => harness.routeNativeElement as HTMLElement;
  const text = (selector: string) =>
    page().querySelector(selector)?.textContent?.trim().replace(/\s+/g, ' ');
  const hrefs = (selector: string) =>
    [...page().querySelectorAll(selector)].map((a) => a.getAttribute('href'));
  const label = (selector: string) =>
    page().querySelector(selector)?.getAttribute('aria-label');

  async function open(url: string, id: string) {
    void harness.navigateByUrl(url);
    return requested(http, `/api/artworks/${id}`);
  }

  /** jsdom has no Touch, so the events carry plain points. */
  function swipe(
    target: Element,
    from: [number, number],
    to: [number, number],
  ) {
    const event = (type: string, touches: object[], changed: object[]) => {
      const e = new Event(type, { bubbles: true });
      Object.defineProperty(e, 'touches', { value: touches });
      Object.defineProperty(e, 'changedTouches', { value: changed });
      target.dispatchEvent(e);
    };
    const point = ([clientX, clientY]: [number, number]) => ({
      clientX,
      clientY,
    });
    event('touchstart', [point(from)], [point(from)]);
    event('touchend', [], [point(to)]);
  }

  describe('moving between pieces', () => {
    const A = artwork(
      { id: 'a', title: 'First' },
      { previous: { id: 'z' }, next: { id: 'b' } },
    );
    const B = artwork(
      { id: 'b', title: 'Second' },
      { previous: { id: 'a' }, next: { id: 'c' } },
    );
    const src = () => page().querySelector('.piece img')?.getAttribute('src');
    const heading = () => text('app-credits-panel h1');
    const stageBusy = () =>
      page().querySelector('.stage')?.getAttribute('aria-busy');
    const stageSkeleton = () => page().querySelector('.stage > app-skeleton');
    const creditsSkeleton = () =>
      page().querySelector('app-credits-panel app-skeleton');
    const imageEvent = (type: 'load' | 'error') =>
      page().querySelector('.piece img')?.dispatchEvent(new Event(type));

    async function onPieceA() {
      (await open('/i/a', 'a')).flush(A);
      await settled();
    }

    it('Moving to the next piece: the page stays in place until the new data arrives', async () => {
      await onPieceA();
      const nodes = () => [
        page().querySelector('app-stage-bar'),
        page().querySelector('[aria-label="Share"]'),
        page().querySelector('app-credits-panel'),
        page().querySelector('.piece img'),
        page().querySelector('.nav.next'),
      ];
      const before = nodes();

      const next = await open('/i/b', 'b');
      await settled();
      expect(src()).toBe('/img/a/full.webp');
      expect(heading()).toBe('First');
      expect(nodes()).toEqual(before);

      next.flush(B);
      await settled();
      expect(src()).toBe('/img/b/full.webp');
      expect(heading()).toBe('Second');
      expect(nodes()).toEqual(before);
    });

    describe('the shape on the stage', () => {
      const file = (w: number, h: number) => ({
        ...artwork().artwork.file,
        w,
        h,
      });
      const WIDE = artwork({ id: 'a', file: file(2000, 1000) });
      const TALL = artwork({ id: 'b', file: file(1000, 2000) });
      const shapeOn = (selector: string) =>
        page()
          .querySelector<HTMLElement>(selector)
          ?.style.getPropertyValue('--shape');
      const shape = () => shapeOn('.stage');

      async function onPiece(piece: ReturnType<typeof artwork>) {
        (await open(`/i/${piece.artwork.id}`, piece.artwork.id)).flush(piece);
        await settled();
      }

      async function movingFromWideToTall() {
        await onPiece(WIDE);
        imageEvent('load');
        await settled();
        await onPiece(TALL);
        expect(src()).toBe('/img/b/full.webp');
      }

      it('From a wide piece to a vertical one: the old image keeps its shape until the new one has loaded', async () => {
        await movingFromWideToTall();
        expect(shape()).toBe('2');

        imageEvent('load');
        await settled();
        expect(shape()).toBe('0.5');
      });

      it('The new image fails: the stage stops waiting and uses the new shape', async () => {
        await movingFromWideToTall();
        expect(shape()).toBe('2');

        imageEvent('error');
        await settled();
        expect(shape()).toBe('0.5');
        expect(stageBusy()).toBeNull();
      });

      it('A size that is not known: the piece is square', async () => {
        await onPiece(artwork({ id: 'a', file: file(400, 0) }));
        expect(shape()).toBe('1');
      });

      it('From a video to an image: with no old image to keep, the new shape applies at once', async () => {
        await onPiece(
          artwork({
            id: 'a',
            file: { ...file(2000, 1000), mime: 'video/mp4' },
          }),
        );
        expect(shape()).toBe('2');

        await onPiece(TALL);
        expect(stageBusy()).toBe('true');
        expect(shape()).toBe('0.5');
      });

      it('From the confirm screen to its image: with no old image to keep, the new shape applies at once', async () => {
        await onPiece(WIDE);
        imageEvent('load');
        await settled();
        await onPiece(artwork({ id: 'b', nsfw: true, file: file(1000, 2000) }));
        expect(page().querySelector('.piece img')).toBeNull();

        page().querySelector<HTMLElement>('.confirm .pad.dark')!.click();
        TestBed.inject(AgeCheckService).pass();
        await settled();
        expect(stageBusy()).toBe('true');
        expect(shape()).toBe('0.5');
      });

      it('Opening full view while the new image loads: it uses the new piece’s shape', async () => {
        // jsdom has no showModal().
        const { showModal } = HTMLDialogElement.prototype;
        HTMLDialogElement.prototype.showModal = () => undefined;
        await movingFromWideToTall();
        expect(shape()).toBe('2');

        page().querySelector<HTMLElement>('.piece')!.click();
        await settled();
        expect(shapeOn('app-full-view .stage')).toBe('0.5');
        HTMLDialogElement.prototype.showModal = showModal;
      });
    });

    it('Moving to a deleted piece: renders the not-found page', async () => {
      await onPieceA();
      (await open('/i/b', 'b')).flush(
        { error: 'Not found.' },
        { status: 404, statusText: 'Not Found' },
      );
      await settled();
      expect(text('h1')).toBe('No tiger here');
      expect(response.status).toBe(404);
    });

    it('Moving when the server fails: shows the error instead of the old piece, with no skeleton', async () => {
      await onPieceA();
      (await open('/i/b', 'b')).flush(null, {
        status: 500,
        statusText: 'Server Error',
      });
      await settled();
      expect(text('.stage-panel p')).toContain('Could not load this piece.');
      expect(src()).toBeUndefined();
      expect(heading()).toBeUndefined();
      expect(stageSkeleton()).toBeNull();
      expect(creditsSkeleton()).toBeNull();
    });

    it('a failed reload of the same piece keeps its details', async () => {
      localStorage.setItem('tigy.nsfw.age', '1');
      await onPieceA();
      TestBed.inject(NsfwSwitchService).set(true);
      (await requested(http, '/api/artworks/a?nsfw=1')).flush(null, {
        status: 500,
        statusText: 'Server Error',
      });
      await settled();
      expect(heading()).toBe('First');
      expect(src()).toBe('/img/a/full.webp');
    });

    it('Moving to an NSFW piece with the switch off: never points at its file, and the confirm screen replaces the old piece', async () => {
      await onPieceA();
      const next = await open('/i/lewd', 'lewd');
      await settled();
      expect(page().innerHTML).not.toContain('/img/lewd');

      next.flush(artwork({ id: 'lewd', nsfw: true }));
      await settled();
      expect(page().innerHTML).not.toContain('/img/lewd');
      expect(page().querySelector('.piece img')).toBeNull();
      expect(text('.confirm')).toContain('Show this piece');
    });

    it('Going back and forth: a visited piece shows its details at once, and its image once the refresh answers', async () => {
      await onPieceA();
      const toB = await open('/i/b', 'b');
      toB.flush(B);
      await settled();
      imageEvent('load');
      await settled();

      const back = await open('/i/a', 'a');
      await settled();
      expect(heading()).toBe('First');
      expect(src()).toBe('/img/b/full.webp');
      expect(creditsSkeleton()).toBeNull();
      expect(stageSkeleton()?.classList.contains('is-delayed')).toBe(true);

      back.flush(A);
      await settled();
      expect(src()).toBe('/img/a/full.webp');
    });

    it('A visited piece flagged NSFW meanwhile: its file is never requested', async () => {
      await onPieceA();
      (await open('/i/b', 'b')).flush(B);
      await settled();

      const back = await open('/i/a', 'a');
      await settled();
      expect(page().innerHTML).not.toContain('/img/a/');

      back.flush(artwork({ id: 'a', nsfw: true }));
      await settled();
      expect(page().innerHTML).not.toContain('/img/a/');
      expect(text('.confirm')).toContain('Show this piece');
    });

    it('The piece changed meanwhile: the refresh replaces what was remembered', async () => {
      await onPieceA();
      (await open('/i/b', 'b')).flush(B);
      await settled();

      const back = await open('/i/a', 'a');
      await settled();
      expect(heading()).toBe('First');
      back.flush(artwork({ id: 'a', title: 'Renamed' }));
      await settled();
      expect(heading()).toBe('Renamed');
    });

    it('The piece is gone: the refresh leads to the not-found page', async () => {
      await onPieceA();
      (await open('/i/b', 'b')).flush(B);
      await settled();

      (await open('/i/a', 'a')).flush(
        { error: 'Not found.' },
        { status: 404, statusText: 'Not Found' },
      );
      await settled();
      expect(text('h1')).toBe('No tiger here');
    });

    it('NSFW piece behind the confirm screen: the controls stay but share, full view and download are unavailable', async () => {
      (await open('/i/lewd', 'lewd')).flush(
        artwork({ id: 'lewd', nsfw: true }),
      );
      await settled();
      const button = (name: string) =>
        page().querySelector<HTMLButtonElement>(`[aria-label="${name}"]`)!;
      expect(button('Share').disabled).toBe(true);
      expect(button('Full view').disabled).toBe(true);
      expect(button('Credits and info').disabled).toBe(false);
      const download = page().querySelector('[aria-label="Download original"]');
      expect(download?.hasAttribute('href')).toBe(false);
      expect(download?.hasAttribute('download')).toBe(false);
    });

    it('Pressing next twice, or previous on the way: moves once, by link, key or swipe', async () => {
      await onPieceA();
      page().querySelector<HTMLElement>('.nav.next')!.click();
      const next = await requested(http, '/api/artworks/b');
      await settled();

      expect(hrefs('.nav.next')).toEqual(['/i/b']);
      expect(hrefs('.nav.prev')).toEqual(['/i/b']);
      expect(
        page().querySelector('.nav.next')?.getAttribute('aria-disabled'),
      ).toBe('true');

      page().querySelector<HTMLElement>('.nav.next')!.click();
      page().querySelector<HTMLElement>('.nav.prev')!.click();
      document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }),
      );
      swipe(page().querySelector('.stage')!, [100, 200], [300, 200]);
      await settled();
      expect(http.match('/api/artworks/z')).toEqual([]);
      expect(TestBed.inject(Router).url).toBe('/i/b');

      next.flush(B);
      await settled();
      expect(hrefs('.nav.next')).toEqual(['/i/c']);
      expect(
        page().querySelector('.nav.next')?.hasAttribute('aria-disabled'),
      ).toBe(false);
    });

    it('Moving after scrolling the credits: the new piece starts at the top', async () => {
      await onPieceA();
      const wrap = page().querySelector('.info-wrap')!;
      wrap.scrollTop = 120;

      (await open('/i/b', 'b')).flush(B);
      await settled();
      expect(wrap.scrollTop).toBe(0);
    });

    it('a refresh of the same piece leaves the credits scroll alone', async () => {
      localStorage.setItem('tigy.nsfw.age', '1');
      await onPieceA();
      const wrap = page().querySelector('.info-wrap')!;
      wrap.scrollTop = 120;

      TestBed.inject(NsfwSwitchService).set(true);
      (await requested(http, '/api/artworks/a?nsfw=1')).flush(A);
      await settled();
      expect(wrap.scrollTop).toBe(120);
    });

    it('First page: never counts as waiting, so no skeleton shows', async () => {
      const first = await open('/i/a', 'a');
      await settled();
      expect(stageSkeleton()).toBeNull();
      expect(creditsSkeleton()).toBeNull();
      first.flush(A);
      await settled();
      expect(stageBusy()).toBeNull();
      expect(stageSkeleton()).toBeNull();
    });

    it('During a move: skeletons wait in place, delayed, until the data and then the image arrive', async () => {
      await onPieceA();
      const next = await open('/i/b', 'b');
      await settled();
      expect(stageSkeleton()?.classList.contains('is-delayed')).toBe(true);
      expect(creditsSkeleton()?.classList.contains('is-delayed')).toBe(true);
      expect(creditsSkeleton()?.classList.contains('is-over')).toBe(true);
      expect(stageBusy()).toBe('true');

      next.flush(B);
      await settled();
      expect(creditsSkeleton()).toBeNull();
      expect(stageSkeleton()?.classList.contains('is-delayed')).toBe(true);

      imageEvent('load');
      await settled();
      expect(stageSkeleton()).toBeNull();
      expect(stageBusy()).toBeNull();
    });

    it('a failed image ends the wait too', async () => {
      await onPieceA();
      (await open('/i/b', 'b')).flush(B);
      await settled();
      expect(stageSkeleton()).not.toBeNull();
      imageEvent('error');
      await settled();
      expect(stageSkeleton()).toBeNull();
    });

    it('Opening a piece from another page: skeletons show at once, with the stage bar around them', async () => {
      await harness.navigateByUrl('/privacy');
      const first = await open('/i/a', 'a');
      await settled();
      expect(page().querySelector('app-stage-bar')).not.toBeNull();
      expect(stageSkeleton()?.classList.contains('is-delayed')).toBe(false);
      expect(creditsSkeleton()?.classList.contains('is-delayed')).toBe(false);
      expect(creditsSkeleton()?.classList.contains('is-over')).toBe(false);

      first.flush(A);
      await settled();
      expect(creditsSkeleton()).toBeNull();
      expect(stageSkeleton()?.classList.contains('is-delayed')).toBe(false);

      imageEvent('load');
      await settled();
      expect(stageSkeleton()).toBeNull();
    });

    it('Opening a piece that fails: stops the skeletons', async () => {
      await harness.navigateByUrl('/privacy');
      (await open('/i/a', 'a')).flush(null, {
        status: 500,
        statusText: 'Server Error',
      });
      await settled();
      expect(stageSkeleton()).toBeNull();
      expect(creditsSkeleton()).toBeNull();
    });
  });

  it('Piece with every field: shows the image, details, credits, tags, file, neighbours and the way back', async () => {
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

    const image = page().querySelector('.piece img')!;
    expect(image.getAttribute('src')).toBe('/img/hey-pookie/full.webp');
    expect(image.getAttribute('width')).toBe('1620');
    expect(text('app-credits-panel h1')).toBe('Hey Pookie!');
    expect(text('.desc')).toBe('A three-panel comic.');
    expect(text('.date')).toBe('14 Feb 2026');
    // Credits in order; Tigy's leads home, without links.
    expect(hrefs('.artists .name')).toEqual(['/?artist=ann', '/?artist=bob']);
    expect(hrefs('.characters .name')).toEqual(['/', '/?character=pookie']);
    expect(hrefs('.artists .links a')).toEqual(['https://x.com/ann']);
    expect(label('.artists .links a')).toBe('Twitter: ann');
    expect(page().querySelector('.characters .links')).toBeNull();
    expect(hrefs('.tags a')).toEqual(['/?tag=comic', '/?tag=couple']);
    expect(text('.file')).toBe('PNG · 1620 × 2117 px · 3.7 MB');
    expect(hrefs('a[download]')).toEqual(['/img/hey-pookie/original.png']);
    expect(page().querySelector('a[download]')?.hasAttribute('download')).toBe(
      true,
    );
    expect(label('.nav.prev')).toBe('Previous: Tigy reference sheet');
    expect(hrefs('.nav.prev')).toEqual(['/i/ref-sheet']);
    expect(label('.nav.next')).toBe('Next: Untitled');
    expect(hrefs('[aria-label="Back to the gallery"]')).toEqual(['/']);
    expect(page().querySelector('.confirm')).toBeNull();
    expect(text('app-credits-panel')).not.toContain('Copy safe link');
  });

  it('Year only: shows just the year', async () => {
    (await open('/i/old', 'old')).flush(artwork({ id: 'old', date: '2019' }));
    await settled();
    expect(text('.date')).toBe('2019');
  });

  it('Piece with only an image: shows "Untitled" and the day it was added, without empty fields', async () => {
    (await open('/i/chibi-tigy', 'chibi-tigy')).flush(
      artwork({ id: 'chibi-tigy', sortDate: '2025-11-20' }),
    );
    await settled();
    expect(text('app-credits-panel h1')).toBe('Untitled');
    expect(text('.date')).toBe('Added 20 Nov 2025');
    expect(page().querySelector('.credits')).toBeNull();
    expect(page().querySelector('.tags')).toBeNull();
    expect(page().querySelector('.desc')).toBeNull();
  });

  it('Unpublished artwork link: renders the not-found page with 404', async () => {
    (await open('/i/draft', 'draft')).flush(
      { error: 'Not found.' },
      { status: 404, statusText: 'Not Found' },
    );
    await settled();
    expect(text('h1')).toBe('No tiger here');
    expect(response.status).toBe(404);
  });

  it('a failed read is sent as 503 and not cached', async () => {
    response.headers = new Headers({ 'Cache-Control': 'public, s-maxage=300' });
    (await open('/i/k3x', 'k3x')).flush(null, {
      status: 500,
      statusText: 'Server Error',
    });
    await settled();
    expect(text('.stage-panel p')).toContain('Could not load this piece.');
    expect(response.status).toBe(503);
    expect(new Headers(response.headers).get('cache-control')).toBe('no-store');
  });

  it('An NSFW piece with the switch off: shows its details behind the confirm screen, without the image', async () => {
    (await open('/i/lewd', 'lewd')).flush(
      artwork({ id: 'lewd', nsfw: true, title: 'Lewd' }),
    );
    await settled();

    expect(page().querySelector('img.piece, .piece img')).toBeNull();
    expect(text('.confirm')).toContain('Show this piece');
    expect(text('app-credits-panel h1')).toBe('Lewd');
    expect(page().querySelector('a[download]')).toBeNull();
    expect(text('app-credits-panel')).toContain('Copy safe link');

    // Confirming one piece: waits for the age check, then shows it without another request.
    page().querySelector<HTMLButtonElement>('.confirm button')!.click();
    await settled();
    expect(page().querySelector('.piece img')).toBeNull();
    TestBed.inject(AgeCheckService).pass();
    await settled();
    expect(page().querySelector('.piece img')?.getAttribute('src')).toBe(
      '/img/lewd/full.webp',
    );
    expect(TestBed.inject(NsfwSwitchService).isOn()).toBe(false);
    expect(JSON.parse(sessionStorage.getItem('tigy.nsfw.confirmed')!)).toEqual([
      'lewd',
    ]);
  });

  it('After the age check passed: showing one piece asks nothing', async () => {
    localStorage.setItem('tigy.nsfw.age', '1');
    (await open('/i/lewd', 'lewd')).flush(artwork({ id: 'lewd', nsfw: true }));
    await settled();
    page().querySelector<HTMLButtonElement>('.confirm button')!.click();
    await settled();
    expect(page().querySelector('.piece img')).not.toBeNull();
    expect(TestBed.inject(AgeCheckService).isPending()).toBe(false);
  });

  it('Safe link of an NSFW piece: copies it and confirms', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
    (await open('/i/lewd', 'lewd')).flush(artwork({ id: 'lewd', nsfw: true }));
    await settled();

    const copy = [...page().querySelectorAll('app-credits-panel button')].find(
      (button) => button.textContent?.includes('Copy safe link'),
    ) as HTMLButtonElement;
    copy.click();
    await settled();
    expect(writeText).toHaveBeenCalledWith(`${location.origin}/i/lewd?safe`);
    expect(text('.toast')).toBe('Safe link copied!');
  });

  it('"Show NSFW everywhere" turns the switch on and swaps in the NSFW-inclusive neighbours', async () => {
    (await open('/i/lewd', 'lewd')).flush(
      artwork({ id: 'lewd', nsfw: true }, { next: { id: 'sfw' } }),
    );
    await settled();

    page().querySelectorAll<HTMLButtonElement>('.confirm button')[1].click();
    await settled();
    expect(TestBed.inject(NsfwSwitchService).isOn()).toBe(false);
    expect(page().querySelector('.piece img')).toBeNull();
    TestBed.inject(AgeCheckService).pass();
    await settled();
    expect(TestBed.inject(NsfwSwitchService).isOn()).toBe(true);
    // The details stay while the neighbours load.
    expect(page().querySelector('.piece img')).not.toBeNull();
    (await requested(http, '/api/artworks/lewd?nsfw=1')).flush(
      artwork({ id: 'lewd', nsfw: true }, { next: { id: 'other-lewd' } }),
    );
    await settled();
    expect(hrefs('.nav.next')).toEqual(['/i/other-lewd']);
  });

  it('Back to a filtered gallery: links to the gallery this tab came from', async () => {
    sessionStorage.setItem('tigy.gallery', '/?character=pookie');
    (await open('/i/hey-pookie', 'hey-pookie')).flush(artwork());
    await settled();
    expect(hrefs('[aria-label="Back to the gallery"]')).toEqual([
      '/?character=pookie',
    ]);
  });

  describe('a video piece', () => {
    const VIDEO_FILE = {
      original: 'images/clip/original.mp4',
      w: 1080,
      h: 1920,
      bytes: 12_300_000,
      mime: 'video/mp4',
      animated: true,
      transparent: false,
      durationMs: 42_000,
      hasAudio: true,
    };
    const clip = (fields: Parameters<typeof artwork>[0] = {}) =>
      artwork({
        id: 'clip',
        title: 'Hey Pookie!',
        file: VIDEO_FILE,
        ...fields,
      });

    let play: ReturnType<typeof vi.fn<() => Promise<void>>>;
    let pause: ReturnType<typeof vi.fn<() => void>>;

    function stubPlayer({ isMotionReduced = false } = {}): void {
      vi.stubGlobal('matchMedia', (query: string) => ({
        matches: query.includes('reduced-motion') && isMotionReduced,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      }));
      play = vi.fn<() => Promise<void>>(() => Promise.resolve());
      pause = vi.fn<() => void>();
      vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(play);
      vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(pause);
      vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(
        () => undefined,
      );
      onTestFinished(() => {
        vi.restoreAllMocks();
      });
    }

    const player = () => page().querySelector<HTMLVideoElement>('video');

    it('Opening a video piece: plays the web copy muted in a loop, with controls and the still as its poster', async () => {
      stubPlayer();
      (await open('/i/clip', 'clip')).flush(clip());
      await settled();

      const video = player()!;
      expect(video.getAttribute('src')).toBe('/img/clip/full.mp4');
      expect(video.getAttribute('poster')).toBe('/img/clip/full.webp');
      expect(video.muted).toBe(true);
      expect(video.volume).toBe(0.5);
      expect(video.loop).toBe(true);
      expect(video.controls).toBe(true);
      expect(video.hasAttribute('playsinline')).toBe(true);
      expect(video.hasAttribute('autoplay')).toBe(false);
      expect(video.getAttribute('preload')).toBe('metadata');
      expect(video.getAttribute('width')).toBe('1080');
      expect(video.getAttribute('aria-label')).toBe('Hey Pookie!');
      expect(play).toHaveBeenCalledTimes(1);
      expect(page().querySelector('.piece')).toBeNull();
      expect(hrefs('a[download]')).toEqual(['/img/clip/original.mp4']);
    });

    it('Video full screen: offers no zooming full view', async () => {
      stubPlayer();
      (await open('/i/clip', 'clip')).flush(clip());
      await settled();
      expect(page().querySelector('[aria-label="Full view"]')).toBeNull();
      expect(text('app-credits-panel')).not.toContain('Full view');
      expect(page().querySelector('app-full-view')).toBeNull();
    });

    it('Reduced motion: leaves the player paused on its still', async () => {
      stubPlayer({ isMotionReduced: true });
      (await open('/i/clip', 'clip')).flush(clip());
      await settled();
      expect(player()).not.toBeNull();
      expect(play).not.toHaveBeenCalled();
    });

    it('keeps playing silently when autoplay is refused', async () => {
      stubPlayer();
      play.mockImplementation(() => Promise.reject(new Error('NotAllowed')));
      (await open('/i/clip', 'clip')).flush(clip());
      await settled();
      expect(player()).not.toBeNull();
    });

    it('Moving to the next piece: stops the video and clears it, so its sound does not carry over', async () => {
      stubPlayer();
      (await open('/i/clip', 'clip')).flush(clip());
      await settled();
      const first = player()!;

      void harness.navigateByUrl('/i/hey-pookie');
      (await requested(http, '/api/artworks/hey-pookie')).flush(artwork());
      await settled();

      expect(pause).toHaveBeenCalled();
      expect(first.hasAttribute('src')).toBe(false);
      expect(player()).toBeNull();
      expect(page().querySelector('.piece img')).not.toBeNull();
    });

    it('stops the video when the page is left', async () => {
      stubPlayer();
      (await open('/i/clip', 'clip')).flush(clip());
      await settled();
      const video = player()!;
      void harness.navigateByUrl('/privacy');
      await settled();
      expect(pause).toHaveBeenCalled();
      expect(video.hasAttribute('src')).toBe(false);
    });

    it('lets the arrow keys seek a focused player instead of changing piece', async () => {
      stubPlayer();
      (await open('/i/clip', 'clip')).flush(
        artwork({ id: 'clip', file: VIDEO_FILE }, { next: { id: 'after' } }),
      );
      await settled();
      player()!.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
      );
      await settled();
      expect(http.match('/api/artworks/after')).toEqual([]);
      document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
      );
      (await requested(http, '/api/artworks/after')).flush(
        artwork({ id: 'after' }),
      );
    });

    it('still goes back to the gallery on Escape from a focused player', async () => {
      stubPlayer();
      const goBack = vi
        .spyOn(StageBar.prototype, 'goBack')
        .mockImplementation(() => undefined);
      (await open('/i/clip', 'clip')).flush(clip());
      await settled();
      player()!.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      );
      expect(goBack).toHaveBeenCalled();
    });

    it('Moving away with the sound on: pauses at once, then plays the next video muted in the same player', async () => {
      stubPlayer();
      (await open('/i/clip', 'clip')).flush(clip());
      await settled();
      const first = player()!;
      first.muted = false;
      pause.mockClear();
      play.mockClear();

      const next = await open('/i/other-clip', 'other-clip');
      await settled();
      expect(pause).toHaveBeenCalled();
      expect(first.getAttribute('src')).toBe('/img/clip/full.mp4');

      next.flush(clip({ id: 'other-clip' }));
      await settled();
      expect(player()).toBe(first);
      expect(first.getAttribute('src')).toBe('/img/other-clip/full.mp4');
      expect(first.muted).toBe(true);
      expect(play).toHaveBeenCalledTimes(1);
    });

    it('Landing on a video, then moving to an image: the stage waits for the image', async () => {
      stubPlayer();
      (await open('/i/clip', 'clip')).flush(clip());
      await settled();
      expect(page().querySelector('.stage > app-skeleton')).toBeNull();

      (await open('/i/hey-pookie', 'hey-pookie')).flush(artwork());
      await settled();
      expect(page().querySelector('.stage > app-skeleton')).not.toBeNull();

      page().querySelector('.piece img')?.dispatchEvent(new Event('load'));
      await settled();
      expect(page().querySelector('.stage > app-skeleton')).toBeNull();
    });

    it('Moving from an image to a video: the controls stay where they were', async () => {
      stubPlayer();
      (await open('/i/hey-pookie', 'hey-pookie')).flush(artwork());
      await settled();
      const controls = () =>
        page().querySelectorAll('app-stage-bar .side:last-child > .round');
      const share = page().querySelector('[aria-label="Share"]');
      const before = controls().length;

      (await open('/i/clip', 'clip')).flush(clip());
      await settled();

      expect(controls()).toHaveLength(before);
      expect(page().querySelector('[aria-label="Share"]')).toBe(share);
      expect(page().querySelector('.spacer')?.getAttribute('aria-hidden')).toBe(
        'true',
      );
    });

    it('changes piece on a swipe across the picture, but not on one along the controls', async () => {
      stubPlayer();
      (await open('/i/clip', 'clip')).flush(
        artwork({ id: 'clip', file: VIDEO_FILE }, { next: { id: 'after' } }),
      );
      await settled();
      vi.spyOn(player()!, 'getBoundingClientRect').mockReturnValue({
        top: 0,
        bottom: 500,
      } as DOMRect);

      swipe(player()!, [300, 470], [100, 470]);
      await settled();
      expect(http.match('/api/artworks/after')).toEqual([]);

      swipe(player()!, [300, 200], [100, 210]);
      (await requested(http, '/api/artworks/after')).flush(
        artwork({ id: 'after' }),
      );
    });

    it('NSFW video behind the confirm screen: loads no video or still until confirmed', async () => {
      stubPlayer();
      localStorage.setItem('tigy.nsfw.age', '1');
      (await open('/i/clip', 'clip')).flush(clip({ nsfw: true }));
      await settled();
      expect(player()).toBeNull();
      expect(page().querySelector('img')).toBeNull();
      expect(text('.confirm')).toContain('Show this piece');

      page().querySelector<HTMLButtonElement>('.confirm button')!.click();
      await settled();
      expect(player()?.getAttribute('src')).toBe('/img/clip/full.mp4');
    });

    it('Video details: shows the format, duration, sound, size and dimensions', async () => {
      stubPlayer();
      (await open('/i/clip', 'clip')).flush(clip());
      await settled();
      expect(text('.file')).toBe(
        'MP4 video · 0:42 · With sound · 1080 × 1920 px · 12.3 MB',
      );
    });

    it('Silent video: says it is silent', async () => {
      stubPlayer();
      (await open('/i/clip', 'clip')).flush(
        clip({
          file: { ...VIDEO_FILE, mime: 'video/webm', hasAudio: false },
        }),
      );
      await settled();
      expect(text('.file')).toBe(
        'WebM video · 0:42 · Silent · 1080 × 1920 px · 12.3 MB',
      );
    });

    it('leaves an image piece without a player', async () => {
      stubPlayer();
      (await open('/i/hey-pookie', 'hey-pookie')).flush(artwork());
      await settled();
      expect(player()).toBeNull();
      expect(page().querySelector('[aria-label="Full view"]')).not.toBeNull();
      expect(text('.file')).toBe('PNG · 1620 × 2117 px · 3.7 MB');
    });
  });
});

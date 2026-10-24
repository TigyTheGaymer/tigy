import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { rendered, row } from '../../testing';
import { toTile } from './tile';
import { Tiles } from './tiles';

/** Records each observer, so a test can say which tiles are near or on screen. */
class FakeObserver {
  static all: FakeObserver[] = [];
  readonly targets = new Set<Element>();
  constructor(
    readonly callback: IntersectionObserverCallback,
    readonly options: IntersectionObserverInit = {},
  ) {
    FakeObserver.all.push(this);
  }
  observe(target: Element): void {
    this.targets.add(target);
  }
  unobserve(target: Element): void {
    this.targets.delete(target);
  }
  disconnect(): void {
    this.targets.clear();
  }
  report(target: Element, isIntersecting: boolean): void {
    this.callback(
      [{ target, isIntersecting } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    );
  }
}

const near = () => FakeObserver.all.find((o) => o.options.rootMargin)!;
const onScreen = () => FakeObserver.all.find((o) => !o.options.rootMargin)!;

let play: ReturnType<typeof vi.fn<() => Promise<void>>>;
let pause: ReturnType<typeof vi.fn<() => void>>;

function stubBrowser({
  isMotionReduced = false,
  isDataSaved = false,
} = {}): void {
  FakeObserver.all = [];
  vi.stubGlobal('IntersectionObserver', FakeObserver);
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('reduced-motion') && isMotionReduced,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
  Object.defineProperty(navigator, 'connection', {
    value: { saveData: isDataSaved },
    configurable: true,
  });
  play = vi.fn<() => Promise<void>>(() => Promise.resolve());
  pause = vi.fn<() => void>();
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(play);
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(pause);
  onTestFinished(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    delete (navigator as { connection?: unknown }).connection;
  });
}

async function open(
  tiles = [toTile(row('vid', { isVideo: true, nsfw: true, title: 'Loop' }))],
) {
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection(), provideRouter([])],
  });
  const fixture = TestBed.createComponent(Tiles);
  fixture.componentRef.setInput('tiles', tiles);
  await rendered();
  const page = fixture.nativeElement as HTMLElement;
  const tile = (id: string) =>
    page.querySelector(`a[href="/i/${id}"]`) as HTMLElement;
  const host = (id: string) =>
    tile(id).querySelector('app-video-preview') as HTMLElement;
  const video = (id: string) => tile(id).querySelector('video');
  return { fixture, page, tile, host, video };
}

describe('VideoPreview', () => {
  it('server render: has only the still', async () => {
    stubBrowser();
    const global = globalThis as { ngServerMode?: boolean };
    global.ngServerMode = true;
    onTestFinished(() => {
      delete global.ngServerMode;
    });
    const { tile, video } = await open();
    expect(tile('vid').querySelector('img')?.getAttribute('src')).toBe(
      '/img/vid/thumb.webp',
    );
    expect(video('vid')).toBeNull();
  });

  it('shows nothing extra for an image', async () => {
    stubBrowser();
    const { tile } = await open([toTile(row('pic'))]);
    expect(tile('pic').querySelector('app-video-preview')).toBeNull();
  });

  it('Off-screen tiles: loads nothing until the tile comes near', async () => {
    stubBrowser();
    const { video } = await open();
    expect(video('vid')?.getAttribute('src')).toBeNull();
    expect(video('vid')?.getAttribute('preload')).toBe('none');
    expect(video('vid')?.muted).toBe(true);
    expect(video('vid')?.loop).toBe(true);
    expect(play).not.toHaveBeenCalled();
  });

  it('Scrolling past a video: loads the preview when near, plays it on screen and pauses it once it has left', async () => {
    stubBrowser();
    const { host, video, fixture } = await open();
    expect(near().options.rootMargin).toBe('50% 0px');

    near().report(host('vid'), true);
    await rendered();
    expect(video('vid')?.getAttribute('src')).toBe('/img/vid/preview.mp4');
    expect(play).not.toHaveBeenCalled();

    onScreen().report(host('vid'), true);
    await rendered();
    expect(play).toHaveBeenCalledTimes(1);

    video('vid')!.dispatchEvent(new Event('playing'));
    fixture.detectChanges();
    expect(video('vid')?.classList).toContain('is-playing');

    onScreen().report(host('vid'), false);
    await rendered();
    expect(pause).toHaveBeenCalled();
    expect(video('vid')?.getAttribute('src')).toBe('/img/vid/preview.mp4');
  });

  it('keeps the still when play() is refused', async () => {
    stubBrowser();
    const { host, video, tile } = await open();
    play.mockImplementation(() => Promise.reject(new Error('NotAllowedError')));
    near().report(host('vid'), true);
    onScreen().report(host('vid'), true);
    await rendered();
    expect(play).toHaveBeenCalled();
    expect(video('vid')?.classList).not.toContain('is-playing');
    expect(tile('vid').querySelector('img')).not.toBeNull();
  });

  it('Reduced motion: shows the still and loads nothing', async () => {
    stubBrowser({ isMotionReduced: true });
    const { video, tile } = await open();
    expect(video('vid')).toBeNull();
    expect(tile('vid').querySelector('img')).not.toBeNull();
  });

  it('Data saver: shows the still and downloads no preview', async () => {
    stubBrowser({ isDataSaved: true });
    const { video } = await open();
    expect(video('vid')).toBeNull();
  });

  it('keeps the title label and NSFW badge on a video tile', async () => {
    stubBrowser();
    const { tile } = await open();
    expect(tile('vid').querySelector('.label')?.textContent?.trim()).toBe(
      'Loop',
    );
    expect(tile('vid').querySelector('.badge')?.textContent?.trim()).toBe(
      'NSFW',
    );
    expect(tile('vid').getAttribute('aria-label')).toBe('Loop, NSFW');
  });

  it('stops watching a tile once it is gone', async () => {
    stubBrowser();
    const { host, fixture } = await open();
    const element = host('vid');
    expect(near().targets.has(element)).toBe(true);
    fixture.componentRef.setInput('tiles', []);
    await rendered();
    expect(near().targets.has(element)).toBe(false);
    expect(onScreen().targets.has(element)).toBe(false);
  });
});

import { TestBed } from '@angular/core/testing';
import {
  provideRouter,
  Router,
  withComponentInputBinding,
} from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { toast } from '@spartan-ng/brain/sonner';
import type { Image, WithId } from '@tigy/models';
import { ConfirmService } from '../shared/confirm.service';
import {
  artwork,
  FakeArtworksApi,
  FakeConfirmService,
  FakeUploadsApi,
  PNG_BYTES,
  record,
  settle,
  text,
} from '../testing';
import { UploadService } from '../uploads/upload.service';
import { UPLOADS_API } from '../uploads/uploads-api';
import { ARTWORKS_API } from './artworks-api';
import { ArtworksPage, READY_BURST_MS } from './artworks';

export async function openArtworks(
  url = '/artworks',
  images: WithId<Image>[] = [],
  confirm = new FakeConfirmService(),
) {
  const api = new FakeArtworksApi(images);
  const uploads = new FakeUploadsApi();
  TestBed.configureTestingModule({
    providers: [
      { provide: ARTWORKS_API, useValue: api },
      { provide: UPLOADS_API, useValue: uploads },
      { provide: ConfirmService, useValue: confirm },
      provideRouter(
        [
          { path: 'artworks', component: ArtworksPage },
          { path: 'artworks/:id', children: [] },
        ],
        withComponentInputBinding(),
      ),
    ],
  });
  const harness = await RouterTestingHarness.create(url);
  const update = async () => {
    await settle();
    await harness.fixture.whenStable();
  };
  await update();
  const page = () => harness.routeNativeElement as HTMLElement;
  const tiles = () =>
    [...page().querySelectorAll('ul[aria-label=Artworks] > li')].map(text);
  const tab = (name: string) =>
    [...page().querySelectorAll<HTMLElement>('[role=tab]')].find((t) =>
      text(t).startsWith(name),
    );
  const button = (name: string) =>
    [...page().querySelectorAll<HTMLElement>('button')].find(
      (b) => text(b) === name || b.getAttribute('aria-label') === name,
    );
  const search = async (value: string) => {
    const field = page().querySelector<HTMLInputElement>('input[type=search]');
    if (!field) throw new Error('No search field');
    field.value = value;
    field.dispatchEvent(new Event('input'));
    await update();
  };
  const select = async (title: string) => {
    page()
      .querySelector<HTMLElement>(`button[aria-label="Select ${title}"]`)
      ?.click();
    await update();
  };
  const uploadTiles = () =>
    [
      ...page().querySelectorAll('ul[aria-label="Uploads in progress"] > li'),
    ].map(text);
  return {
    api,
    uploads,
    confirm,
    harness,
    page,
    tiles,
    tab,
    button,
    search,
    select,
    update,
    uploadTiles,
  };
}

const url = () => TestBed.inject(Router).url;

const credited = { artistIds: ['ann'], title: 'Done', date: '2024' };

const png = (name: string) => ({
  file: new File([PNG_BYTES], name),
  format: 'png' as const,
});

describe('ArtworksPage', () => {
  afterEach(() => vi.restoreAllMocks());

  it('A new upload appears: unpublished and Untitled, without reloading', async () => {
    const { api, tiles, update } = await openArtworks('/artworks', [
      artwork('old', { ...credited, sortDate: '2024-01-01', published: true }),
    ]);
    api.emit([...api.images, artwork('new')]);
    await update();
    expect(tiles()[0]).toMatch(/^Untitled Added 20 Nov 2025 Unpublished/);
    expect(tiles()).toHaveLength(2);
  });

  it('Partial date in the list: shows "Apr 2021"', async () => {
    const { tiles } = await openArtworks('/artworks', [
      artwork('a', { title: 'Pool', date: '2021-04', sortDate: '2021-04-01' }),
    ]);
    expect(tiles()[0]).toContain('Pool Apr 2021');
  });

  it('shows the published and NSFW states, and the counts of every artwork', async () => {
    const { page, tiles } = await openArtworks('/artworks', [
      artwork('a', { ...credited, published: true, nsfw: true }),
      artwork('b', { ...credited, published: true }),
      artwork('c', credited),
    ]);
    expect(tiles()).toEqual([
      'Done 2024 Unpublished',
      'Done 2024 Published',
      'Done 2024 Published NSFW',
    ]);
    expect(text(page().querySelector('[aria-label=Counts]'))).toBe(
      '1 published SFW · 1 published NSFW · 1 unpublished',
    );
  });

  it('Unpublished pieces to work through: lists only unpublished artworks, newest first', async () => {
    const { tab, tiles, update } = await openArtworks('/artworks', [
      artwork('a', { title: 'Old', sortDate: '2020-01-01' }),
      artwork('b', { title: 'Shown', published: true }),
      artwork('c', { title: 'New', sortDate: '2026-01-01' }),
    ]);
    tab('Unpublished')?.click();
    await update();
    expect(tiles().map((t) => t.split(' ')[0])).toEqual(['New', 'Old']);
    expect(url()).toBe('/artworks?view=unpublished');
  });

  it('Search within a view: published NSFW pieces whose title contains "pool"', async () => {
    const { search, tiles } = await openArtworks('/artworks?view=nsfw', [
      artwork('a', { title: 'Pool day', published: true, nsfw: true }),
      artwork('b', { title: 'Beach', published: true, nsfw: true }),
      artwork('c', { title: 'POOL party', published: true }),
    ]);
    await search('pool');
    expect(tiles()).toEqual([expect.stringMatching(/^Pool day/)]);
    expect(url()).toBe('/artworks?view=nsfw&q=pool');
  });

  it('Pieces that need work: lists them with their count and what each lacks', async () => {
    const { tab, tiles } = await openArtworks('/artworks?view=needs-work', [
      artwork('a', { title: 'Untimed', published: true }),
      artwork('b', credited),
    ]);
    expect(text(tab('Needs work'))).toBe('Needs work 1');
    expect(tiles()).toEqual([expect.stringContaining('No artist No date')]);
  });

  it('Finishing a piece: it leaves Needs work and the count drops', async () => {
    const { api, tab, tiles, update } = await openArtworks(
      '/artworks?view=needs-work',
      [
        artwork('a', { ...credited, date: undefined }),
        artwork('b', { title: 'Other', sortDate: '2020-01-01' }),
      ],
    );
    expect(text(tab('Needs work'))).toBe('Needs work 2');
    await api.update('a', { date: '2024', sortDate: '2024-01-01' });
    await update();
    expect(text(tab('Needs work'))).toBe('Needs work 1');
    expect(tiles()).toEqual([expect.stringMatching(/^Other/)]);
  });

  it('Reloading a filtered list: opens with the view and search from the address', async () => {
    const { page, tab } = await openArtworks(
      '/artworks?view=unpublished&q=pool',
    );
    expect(tab('Unpublished')?.getAttribute('aria-selected')).toBe('true');
    expect(
      page().querySelector<HTMLInputElement>('input[type=search]')?.value,
    ).toBe('pool');
  });

  it('Tile without an artist: says "No artist"', async () => {
    const { tiles } = await openArtworks('/artworks', [
      artwork('a', { ...credited, artistIds: [] }),
      artwork('b', { ...credited, sortDate: '2020-01-01' }),
    ]);
    expect(tiles()[0]).toContain('No artist');
    expect(tiles()[1]).not.toContain('No artist');
  });

  it("shows a video's duration on its tile, and none on an image's", async () => {
    const { tiles, page } = await openArtworks('/artworks', [
      artwork('vid', {
        ...credited,
        file: {
          original: 'images/vid/original.mp4',
          w: 1920,
          h: 1080,
          bytes: 1000,
          mime: 'video/mp4',
          animated: true,
          transparent: false,
          durationMs: 60_000,
          hasAudio: true,
        },
      }),
      artwork('pic', { ...credited, sortDate: '2020-01-01' }),
    ]);
    expect(tiles()[0]).toContain('1:00');
    expect(page().querySelector('[aria-label="Video, 1:00"]')).not.toBeNull();
    expect(tiles()[1]).not.toMatch(/\d:\d\d/);
  });

  it('links each tile to its editor with the view and search', async () => {
    const { page } = await openArtworks('/artworks?view=unpublished&q=pool', [
      artwork('k3x', { title: 'Pool' }),
    ]);
    expect(
      page().querySelector('ul[aria-label=Artworks] a')?.getAttribute('href'),
    ).toBe('/artworks/k3x?view=unpublished&q=pool');
  });

  it('offers a shortcut to Needs work, which a phone hides off the end of the tabs', async () => {
    const { page, update } = await openArtworks('/artworks', [
      artwork('a'),
      artwork('b', credited),
    ]);
    const shortcut = [...page().querySelectorAll<HTMLElement>('button')].find(
      (b) => text(b) === '1 need work',
    );
    expect(shortcut?.className).toContain('md:hidden');
    shortcut?.click();
    await update();
    expect(url()).toBe('/artworks?view=needs-work');
    expect(text(page())).not.toContain('1 need work');
  });

  it('says when there are no artworks', async () => {
    const { page } = await openArtworks('/artworks');
    expect(text(page())).toContain('No artworks yet');
  });

  it('says when no artwork matches', async () => {
    const { page } = await openArtworks('/artworks?q=zzz', [artwork('a')]);
    expect(text(page())).toContain('No artworks match');
  });

  describe('selection', () => {
    const five = () =>
      ['a', 'b', 'c', 'd', 'e'].map((id, i) =>
        artwork(id, {
          title: `Piece ${id}`,
          sortDate: `2024-01-0${9 - i}`,
          artistIds: i < 2 ? [] : ['ann'],
        }),
      );

    it('Publishing a batch with uncredited pieces: asks, then publishes all five in one batch', async () => {
      const confirm = new FakeConfirmService(true);
      const success = vi.spyOn(toast, 'success');
      const { api, button, page, update } = await openArtworks(
        '/artworks',
        five(),
        confirm,
      );
      page()
        .querySelector<HTMLElement>(
          'button[aria-label="Select every artwork in this view"]',
        )
        ?.click();
      await update();
      expect(text(page().querySelector('[role=toolbar]'))).toContain(
        '5 selected',
      );
      button('Publish')?.click();
      await update();
      expect(confirm.asked).toEqual([
        {
          title: 'Publish anyway?',
          description: '2 of 5 have no artist credited.',
          confirm: 'Publish',
        },
      ]);
      expect(api.batches).toEqual([
        { ids: ['a', 'b', 'c', 'd', 'e'], edits: { published: true } },
      ]);
      expect(success).toHaveBeenCalledWith('Published 5 artworks');
      expect(page().querySelector('[role=toolbar]')).toBeNull();
    });

    it('publishes nothing when the owner declines', async () => {
      const { api, button, select } = await openArtworks(
        '/artworks',
        five(),
        new FakeConfirmService(false),
      );
      await select('Piece a');
      button('Publish')?.click();
      await settle();
      expect(api.batches).toEqual([]);
    });

    it('publishes credited pieces without asking', async () => {
      const confirm = new FakeConfirmService();
      const { api, button, select, update } = await openArtworks(
        '/artworks',
        five(),
        confirm,
      );
      await select('Piece c');
      await select('Piece d');
      button('Publish')?.click();
      await update();
      expect(confirm.asked).toEqual([]);
      expect(api.batches).toEqual([
        { ids: ['c', 'd'], edits: { published: true } },
      ]);
    });

    it.each([
      ['Unpublish', { published: false }],
      ['Mark NSFW', { nsfw: true }],
      ['Unmark NSFW', { nsfw: false }],
    ])('%s writes one batch', async (name, edits) => {
      const { api, button, select, update } = await openArtworks(
        '/artworks',
        five(),
      );
      await select('Piece a');
      await select('Piece e');
      button(name)?.click();
      await update();
      expect(api.batches).toEqual([{ ids: ['a', 'e'], edits }]);
    });

    it('Deleting a batch: asks to confirm deleting 3 artworks, then deletes them in one batch', async () => {
      const confirm = new FakeConfirmService(true);
      const { api, button, select, tiles, update } = await openArtworks(
        '/artworks',
        five(),
        confirm,
      );
      for (const id of ['a', 'b', 'c']) await select(`Piece ${id}`);
      button('Delete')?.click();
      await update();
      expect(confirm.asked[0].title).toBe('Delete 3 artworks?');
      expect(api.batches).toEqual([{ ids: ['a', 'b', 'c'], edits: 'delete' }]);
      expect(tiles()).toHaveLength(2);
    });

    it('Publishing from the Unpublished view: the selection is cleared although the pieces leave the view before the write returns', async () => {
      const { api, button, page, select, update } = await openArtworks(
        '/artworks?view=unpublished',
        five(),
      );
      let finish = () => undefined as void;
      vi.spyOn(api, 'updateMany').mockImplementation(async (ids, edits) => {
        api.emit(
          api.images.map((i) => (ids.includes(i.id) ? { ...i, ...edits } : i)),
        );
        await new Promise<void>((resolve) => (finish = resolve));
      });
      await select('Piece c');
      await select('Piece d');
      button('Publish')?.click();
      await update();
      finish();
      await update();

      // Unpublished elsewhere, they come back unselected.
      api.emit(five());
      await update();
      expect(page().querySelector('[role=toolbar]')).toBeNull();
    });

    it('says when a batch fails, and keeps the selection', async () => {
      const error = vi.spyOn(toast, 'error');
      const { api, button, page, select, update } = await openArtworks(
        '/artworks',
        five(),
      );
      await select('Piece c');
      api.shouldFail = true;
      button('Unpublish')?.click();
      await update();
      expect(error).toHaveBeenCalledWith('Nothing was changed', {
        description: 'The action failed for every selected artwork. Try again.',
      });
      expect(text(page().querySelector('[role=toolbar]'))).toContain(
        '1 selected',
      );
    });

    async function shiftSelect(page: HTMLElement, title: string) {
      const box = page.querySelector<HTMLElement>(
        `button[aria-label="Select ${title}"]`,
      );
      box?.dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true, shiftKey: true }),
      );
      box?.click();
    }

    const selectedTitles = (page: HTMLElement) =>
      [
        ...page.querySelectorAll<HTMLElement>(
          'button[role=checkbox][aria-checked=true][aria-label^="Select Piece"]',
        ),
      ].map((b) => b.getAttribute('aria-label')?.slice('Select '.length));

    it('selects every tile between the last one clicked and a Shift-click', async () => {
      const { page, select, update } = await openArtworks('/artworks', five());
      await select('Piece b');
      shiftSelect(page(), 'Piece d');
      await update();
      expect(selectedTitles(page())).toEqual(['Piece b', 'Piece c', 'Piece d']);
    });

    it('Shift-click works upwards too, and clears a range the same way', async () => {
      const { page, select, update } = await openArtworks('/artworks', five());
      await select('Piece e');
      shiftSelect(page(), 'Piece a');
      await update();
      expect(selectedTitles(page())).toHaveLength(5);
      await select('Piece b');
      shiftSelect(page(), 'Piece d');
      await update();
      expect(selectedTitles(page())).toEqual(['Piece a', 'Piece e']);
    });

    it('selects at most 500 artworks', async () => {
      const many = Array.from({ length: 501 }, (_, i) =>
        artwork(`p${String(i).padStart(3, '0')}`, { title: `P${i}` }),
      );
      const { page, update } = await openArtworks('/artworks', many);
      page()
        .querySelector<HTMLElement>(
          'button[aria-label="Select every artwork in this view"]',
        )
        ?.click();
      await update();
      expect(text(page().querySelector('[role=toolbar]'))).toContain(
        '500 selected',
      );
    }, 20_000);
  });

  describe('uploading', () => {
    it('offers an Upload button that picks several of the supported pictures and videos', async () => {
      const { page } = await openArtworks();
      const field = page().querySelector<HTMLInputElement>('input[type=file]');
      expect(field?.multiple).toBe(true);
      expect(field?.accept).toBe(
        'image/jpeg,image/png,image/gif,image/webp,video/mp4,video/quicktime,video/webm',
      );
    });

    function drag(type: string, files: File[] = [], types = ['Files']) {
      const event = new Event(type, { bubbles: true, cancelable: true });
      Object.defineProperty(event, 'dataTransfer', {
        value: { types, files, dropEffect: 'none' },
      });
      document.body.dispatchEvent(event);
      return event;
    }

    it('Dropping files on the list: uploads all three', async () => {
      const { page, uploads, update } = await openArtworks();
      drag('dragenter');
      await update();
      expect(text(page())).toContain('Drop to upload');
      const files = ['a', 'b', 'c'].map(
        (n) => new File([PNG_BYTES], `${n}.png`),
      );
      drag('drop', files);
      await vi.waitFor(() => expect(uploads.uploads).toHaveLength(3));
      await update();
      expect(uploads.uploads.map((u) => u.path)).toEqual([
        'uploads/u1/source',
        'uploads/u2/source',
        'uploads/u3/source',
      ]);
      expect(text(page())).not.toContain('Drop to upload');
    });

    it('Unsupported file dropped on the list: is not uploaded, and the admin says why', async () => {
      const error = vi.spyOn(toast, 'error');
      const { uploads, update } = await openArtworks();
      drag('drop', [new File(['....ftypheic'], 'photo.heic')]);
      await vi.waitFor(() => expect(error).toHaveBeenCalled());
      expect(uploads.uploads).toEqual([]);
      expect(error).toHaveBeenCalledWith("photo.heic wasn't uploaded", {
        description:
          'Only JPEG, PNG, GIF, WebP, MP4, MOV and WebM are supported.',
      });
    });

    it('ignores a drag that carries no files', async () => {
      const { page, update } = await openArtworks();
      const event = drag('dragenter', [], ['text/plain']);
      await update();
      expect(event.defaultPrevented).toBe(false);
      expect(text(page())).not.toContain('Drop to upload');
    });
  });

  describe('upload tiles', () => {
    afterEach(() => vi.useRealTimers());

    it('Uploading while viewing published pieces: tiles at the top, then a message with a link to Unpublished', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const message = vi.spyOn(toast, 'message');
      const { api, uploads, update, uploadTiles, harness } =
        await openArtworks('/artworks?view=sfw');
      TestBed.inject(UploadService).start([png('a.png'), png('b.png')]);
      uploads.uploads[0].progress(0.5);
      await update();
      expect(uploadTiles()).toEqual([
        expect.stringMatching(/Uploading/),
        expect.stringMatching(/Uploading/),
      ]);
      expect(uploadTiles().join()).toContain('Uploading 50%');

      uploads.uploads.forEach((u) => u.finish());
      await update();
      expect(uploadTiles()).toEqual([
        expect.stringContaining('Processing'),
        expect.stringContaining('Processing'),
      ]);

      uploads.emit([
        record('u1', { fileName: 'a.png', status: 'ready' }),
        record('u2', { fileName: 'b.png', status: 'ready' }),
      ]);
      api.emit([artwork('u1'), artwork('u2')]);
      await update();
      expect(uploadTiles()).toEqual([]);

      await vi.advanceTimersByTimeAsync(READY_BURST_MS);
      expect(message).toHaveBeenCalledTimes(1);
      const [title, options] = message.mock.calls[0];
      expect(title).toBe('2 artworks ready');
      (options?.action as { onClick: (e: MouseEvent) => void }).onClick(
        new MouseEvent('click'),
      );
      await harness.fixture.whenStable();
      expect(url()).toBe('/artworks?view=unpublished');
    });

    it('Upload finishing on the Unpublished view: its tile becomes the artwork, with no message', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const message = vi.spyOn(toast, 'message');
      const { api, uploads, update, uploadTiles, tiles } = await openArtworks(
        '/artworks?view=unpublished',
      );
      TestBed.inject(UploadService).start([png('a.png')]);
      uploads.uploads[0].finish();
      await update();
      expect(uploadTiles()).toEqual([expect.stringContaining('Processing')]);

      uploads.emit([record('u1', { fileName: 'a.png', status: 'ready' })]);
      api.emit([artwork('u1')]);
      await update();
      expect(uploadTiles()).toEqual([]);
      expect(tiles()).toEqual([expect.stringMatching(/^Untitled/)]);
      await vi.advanceTimersByTimeAsync(READY_BURST_MS);
      expect(message).not.toHaveBeenCalled();
    });

    it('Failure while away: shows the failed tile with its reason until dismissed', async () => {
      const { page, uploads, update, uploadTiles } = await openArtworks(
        '/artworks?view=nsfw',
      );
      uploads.emit([
        record('f1', {
          fileName: 'cut.png',
          status: 'failed',
          error: 'damaged',
        }),
        record('r1', { fileName: 'ok.png', status: 'ready' }),
      ]);
      await update();
      expect(uploadTiles()).toEqual([
        expect.stringContaining('cut.png The file is damaged'),
      ]);
      page()
        .querySelector<HTMLElement>('button[aria-label="Dismiss cut.png"]')
        ?.click();
      await update();
      expect(uploads.deleted).toEqual(['f1']);
    });
  });
});

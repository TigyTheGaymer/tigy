import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { FakeUploadsApi, record, settle } from '../testing';
import { PROCESSING_LIMIT_MS } from './upload-list';
import { UploadService } from './upload.service';
import { UPLOADS_API } from './uploads-api';
import { UploadsPage } from './uploads';

async function open() {
  const api = new FakeUploadsApi();
  TestBed.configureTestingModule({
    providers: [{ provide: UPLOADS_API, useValue: api }, provideRouter([])],
  });
  const fixture = TestBed.createComponent(UploadsPage);
  await fixture.whenStable();
  const page = fixture.nativeElement as HTMLElement;
  const rows = () =>
    [...page.querySelectorAll('li')].map((li) =>
      li.textContent?.replace(/\s+/g, ' ').trim(),
    );
  const update = async () => {
    await settle();
    await fixture.whenStable();
  };
  return { api, fixture, page, rows, update };
}

const READY_FILE = {
  w: 512,
  h: 2048,
  bytes: 3_400_000,
  mime: 'image/png',
  animated: false,
};

describe('UploadsPage', () => {
  it('shows an empty state before the first upload', async () => {
    const { page } = await open();
    expect(page.textContent).toContain('No uploads yet');
  });

  it('shows each status', async () => {
    const { api, rows, update } = await open();
    api.emit([
      record(
        'ready',
        { fileName: 'comic.png', status: 'ready', file: READY_FILE },
        4,
      ),
      record(
        'broken',
        { fileName: 'cut.png', status: 'failed', error: 'damaged' },
        3,
      ),
      record(
        'huge',
        { fileName: 'huge.png', status: 'failed', error: 'too-large' },
        2,
      ),
      record('busy', { fileName: 'busy.png' }),
    ]);
    await update();
    expect(rows()).toEqual([
      expect.stringMatching(/busy\.png Processing/),
      expect.stringMatching(/comic\.png Ready PNG, 512 × 2048, 3\.4 MB/),
      expect.stringMatching(/cut\.png Failed The file is damaged/),
      expect.stringMatching(
        /huge\.png Failed The picture is too large to process/,
      ),
    ]);
  });

  it('A video becomes ready: its row shows the still, dimensions, duration and size', async () => {
    const { api, page, rows, update } = await open();
    api.emit([
      record('v1', {
        fileName: 'loop.mp4',
        status: 'ready',
        file: {
          w: 1920,
          h: 1080,
          bytes: 48_000_000,
          mime: 'video/mp4',
          animated: true,
          durationMs: 60_000,
        },
      }),
    ]);
    await update();
    expect(rows()).toEqual([
      expect.stringMatching(
        /loop\.mp4 Ready MP4 video, 1920 × 1080, 1:00, 48\.0 MB/,
      ),
    ]);
    expect(page.querySelector('li img')?.getAttribute('src')).toContain(
      '/o/images%2Fv1%2Fthumb.webp?alt=media',
    );
  });

  it('says why a video was refused', async () => {
    const { api, rows, update } = await open();
    api.emit(
      (
        [
          ['long', 'video-too-long'],
          ['big', 'video-too-large'],
          ['odd', 'unreadable'],
          ['png', 'file-too-large'],
        ] as const
      ).map(([id, error], i) =>
        record(id, { fileName: `${id}.mov`, status: 'failed', error }, 4 - i),
      ),
    );
    await update();
    expect(rows()).toEqual([
      expect.stringMatching(
        /long\.mov Failed Videos may be at most 3 minutes long/,
      ),
      expect.stringMatching(
        /big\.mov Failed Videos may be at most 3840 × 2160 pixels/,
      ),
      expect.stringMatching(/odd\.mov Failed The file could not be read/),
      expect.stringMatching(/png\.mov Failed .*the limit for images is 50 MB/),
    ]);
  });

  it('uploads a video with its content type', async () => {
    const { api } = await open();
    TestBed.inject(UploadService).start([
      { file: new File([new Uint8Array(10)], 'clip.mov'), format: 'mov' },
    ]);
    await settle();
    expect(api.uploads[0].metadata.contentType).toBe('video/quicktime');
  });

  it('shows a record that ran out of time as failed', async () => {
    const { api, rows, update } = await open();
    api.emit([
      record(
        'slow',
        { fileName: 'slow.gif' },
        Date.now() - PROCESSING_LIMIT_MS - 60_000,
      ),
    ]);
    await update();
    expect(rows()).toEqual([
      expect.stringMatching(/slow\.gif Failed Processing took too long/),
    ]);
  });

  it('From upload to ready: shows the progress, then processing, then the result', async () => {
    const { api, page, rows, update } = await open();
    TestBed.inject(UploadService).start([
      { file: new File([new Uint8Array(10)], 'piece.png'), format: 'png' },
    ]);
    api.uploads[0].progress(0.25);
    await update();
    expect(rows()).toEqual([expect.stringMatching(/piece\.png Uploading 25%/)]);

    api.uploads[0].finish();
    await update();
    expect(rows()).toEqual([expect.stringMatching(/piece\.png Processing/)]);

    api.emit([
      record('u1', {
        fileName: 'piece.png',
        status: 'ready',
        file: READY_FILE,
      }),
    ]);
    await update();
    expect(rows()).toEqual([expect.stringMatching(/piece\.png Ready/)]);
    expect(page.querySelector('li img')?.getAttribute('src')).toContain(
      '/o/images%2Fu1%2Fthumb.webp?alt=media',
    );
  });

  it('offers clearing only for finished rows, and clears after confirming', async () => {
    const { api, fixture, page, update } = await open();
    api.emit([
      record('done', { status: 'ready', file: READY_FILE }, 2),
      record('busy'),
    ]);
    await update();
    const clearButtons = page.querySelectorAll<HTMLElement>(
      'button[aria-label="Clear from the list"]',
    );
    expect(clearButtons).toHaveLength(1);

    clearButtons[0].click();
    await fixture.whenStable();
    const confirm = [...document.querySelectorAll<HTMLElement>('button')].find(
      (button) => button.textContent?.trim() === 'Clear',
    );
    expect(document.body.textContent).toContain(
      'The artwork stays, with its files.',
    );
    confirm?.click();
    await update();
    expect(api.deleted).toEqual(['done']);
  });
});

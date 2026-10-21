import { TestBed } from '@angular/core/testing';
import { FakeUploadsApi, record, settle } from '../testing';
import { PROCESSING_LIMIT_MS } from './upload-list';
import { UploadService } from './upload.service';
import { UPLOADS_API } from './uploads-api';
import { UploadsPage } from './uploads';

async function open() {
  const api = new FakeUploadsApi();
  TestBed.configureTestingModule({
    providers: [{ provide: UPLOADS_API, useValue: api }],
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
    expect(page.querySelector('li img')?.getAttribute('src')).toContain('#u1');
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

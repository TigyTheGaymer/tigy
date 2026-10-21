import { TestBed } from '@angular/core/testing';
import { FakeUploadsApi, settle } from '../testing';
import { UploadService, type FileToUpload } from './upload.service';
import { UPLOADS_API } from './uploads-api';

function setUp() {
  const api = new FakeUploadsApi();
  TestBed.configureTestingModule({
    providers: [{ provide: UPLOADS_API, useValue: api }],
  });
  return { api, service: TestBed.inject(UploadService) };
}

const files = (...names: string[]): FileToUpload[] =>
  names.map((name) => ({
    file: new File([new Uint8Array(10)], name),
    format: 'png',
  }));

const state = (service: UploadService) =>
  service.local().map(({ fileName, state, progress }) => ({
    fileName,
    state,
    progress,
  }));

describe('UploadService', () => {
  it("sends each file to its upload's source path with its name and detected type", () => {
    const { api, service } = setUp();
    service.start(files('piece.jpg'));
    expect(api.uploads[0].path).toBe('uploads/u1/source');
    expect(api.uploads[0].metadata).toEqual({
      contentType: 'image/png',
      customMetadata: { fileName: 'piece.jpg' },
    });
  });

  it('Dropping three files: lists all three at once, and keeps each one’s progress', () => {
    const { api, service } = setUp();
    service.start(files('a.png', 'b.png', 'c.png'));
    api.uploads[1].progress(0.5);
    expect(state(service)).toEqual([
      { fileName: 'a.png', state: 'uploading', progress: 0 },
      { fileName: 'b.png', state: 'uploading', progress: 0.5 },
      { fileName: 'c.png', state: 'uploading', progress: 0 },
    ]);
  });

  it('sends at most three files at a time, and the next when one finishes', async () => {
    const { api, service } = setUp();
    service.start(files('a.png', 'b.png', 'c.png', 'd.png', 'e.png'));
    expect(api.uploads.map((u) => u.path)).toEqual([
      'uploads/u1/source',
      'uploads/u2/source',
      'uploads/u3/source',
    ]);
    expect(service.local().filter((u) => u.state === 'waiting')).toHaveLength(
      2,
    );

    api.uploads[0].finish();
    await settle();
    expect(api.uploads).toHaveLength(4);
    expect(service.local().find((u) => u.id === 'u1')).toMatchObject({
      state: 'sent',
      progress: 1,
    });
  });

  it('marks a file whose upload fails, and moves on', async () => {
    const { api, service } = setUp();
    service.start(files('a.png', 'b.png', 'c.png', 'd.png'));
    api.uploads[2].fail();
    await settle();
    expect(service.local().find((u) => u.id === 'u3')?.state).toBe('failed');
    expect(api.uploads).toHaveLength(4);
  });

  it('asks before leaving only while files are uploading', async () => {
    const { api, service } = setUp();
    const leave = () => {
      const event = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    };
    expect(leave()).toBe(false);

    service.start(files('a.png'));
    TestBed.tick();
    expect(leave()).toBe(true);

    api.uploads[0].finish();
    await settle();
    TestBed.tick();
    expect(leave()).toBe(false);
  });

  it('forgets a row', () => {
    const { service } = setUp();
    service.start(files('a.png'));
    service.forget('u1');
    expect(service.local()).toEqual([]);
  });
});

import { record } from '../testing';
import { listUploads, PROCESSING_LIMIT_MS } from './upload-list';
import type { LocalUpload } from './upload.service';

const NOW = Date.parse('2026-11-02T12:00:00Z');

function local(id: string, fields: Partial<LocalUpload> = {}): LocalUpload {
  return {
    id,
    fileName: `${id}.png`,
    bytes: 1000,
    state: 'uploading',
    progress: 0.4,
    startedAt: NOW - 1000,
    ...fields,
  };
}

describe('listUploads', () => {
  it('lists local files and records together, newest first', () => {
    const rows = listUploads(
      [local('new', { startedAt: NOW })],
      [record('old', { status: 'ready' }, NOW - 60_000)],
      NOW,
    );
    expect(rows.map((r) => [r.id, r.status])).toEqual([
      ['new', 'uploading'],
      ['old', 'ready'],
    ]);
    expect(rows[0].progress).toBe(0.4);
  });

  it('shows a sent file as processing while it waits for its record', () => {
    const [row] = listUploads([local('a', { state: 'sent' })], [], NOW);
    expect(row.status).toBe('processing');
  });

  it("uses the record once it exists, in place of the browser's row", () => {
    const rows = listUploads(
      [local('a', { state: 'sent' })],
      [
        record('a', {
          status: 'ready',
          file: { w: 1, h: 1, bytes: 1, mime: 'image/png', animated: false },
        }),
      ],
      NOW,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      status: 'ready',
      file: { mime: 'image/png' },
    });
  });

  it('shows a failed record with its reason, and a file that was never sent', () => {
    const rows = listUploads(
      [local('b', { state: 'failed' })],
      [record('a', { status: 'failed', error: 'damaged' }, NOW - 5000)],
      NOW,
    );
    expect(rows.map((r) => [r.id, r.status, r.reason])).toEqual([
      ['b', 'failed', 'not-sent'],
      ['a', 'failed', 'damaged'],
    ]);
  });

  it('Processing never finishes: shows a record still processing after 10 minutes as failed', () => {
    const justInTime = record('a', {}, NOW - PROCESSING_LIMIT_MS);
    const tooLate = record('b', {}, NOW - PROCESSING_LIMIT_MS - 1);
    const rows = listUploads([], [justInTime, tooLate], NOW);
    expect(rows.map((r) => [r.id, r.status, r.reason])).toEqual([
      ['a', 'processing', undefined],
      ['b', 'failed', 'too-long'],
    ]);
  });
});

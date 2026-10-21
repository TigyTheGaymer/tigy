import type { Upload, UploadError, WithId } from '@tigy/models';
import type { LocalUpload } from './upload.service';

export type UploadListStatus = 'uploading' | 'processing' | 'ready' | 'failed';

export type FailureReason = UploadError | 'too-long' | 'not-sent';

export interface UploadListItem {
  id: string;
  fileName: string;
  status: UploadListStatus;
  progress?: number;
  file?: Upload['file'];
  reason?: FailureReason;
  time: number;
}

/** The function times out after 9 minutes, so a record still processing after 10 never finishes. */
export const PROCESSING_LIMIT_MS = 10 * 60 * 1000;

/** The upload list, newest first: each record, and each local file that has none yet. */
export function listUploads(
  local: readonly LocalUpload[],
  records: readonly WithId<Upload>[],
  now: number,
): UploadListItem[] {
  const recorded = new Set(records.map((record) => record.id));
  const rows = [
    ...records.map((record) => recordRow(record, now)),
    ...local.filter((upload) => !recorded.has(upload.id)).map(localRow),
  ];
  return rows.sort((a, b) => b.time - a.time);
}

export function isClearable(row: UploadListItem): boolean {
  return row.status === 'ready' || row.status === 'failed';
}

function recordRow(record: WithId<Upload>, now: number): UploadListItem {
  const time = record.createdAt.toDate().getTime();
  const row = { id: record.id, fileName: record.fileName, time };
  switch (record.status) {
    case 'ready':
      return { ...row, status: 'ready', file: record.file };
    case 'failed':
      return { ...row, status: 'failed', reason: record.error ?? 'internal' };
    case 'processing':
      return now - time > PROCESSING_LIMIT_MS
        ? { ...row, status: 'failed', reason: 'too-long' }
        : { ...row, status: 'processing' };
  }
}

function localRow(upload: LocalUpload): UploadListItem {
  const row = {
    id: upload.id,
    fileName: upload.fileName,
    time: upload.startedAt,
  };
  switch (upload.state) {
    case 'waiting':
    case 'uploading':
      return { ...row, status: 'uploading', progress: upload.progress };
    case 'sent':
      return { ...row, status: 'processing' };
    case 'failed':
      return { ...row, status: 'failed', reason: 'not-sent' };
  }
}

import { computed, inject, Service, signal } from '@angular/core';
import { toast } from '@spartan-ng/brain/sonner';
import { uploadPaths } from '@tigy/models';
import { FORMATS, type FileFormat } from '@tigy/uploads';
import { warnBeforeLeaving } from '../shared/leave-warning';
import { checkFile, REFUSAL_MESSAGES } from './check-file';
import { UPLOADS_API } from './uploads-api';

export const MAX_PARALLEL_UPLOADS = 3;

/** A file this browser is sending; it has no record until processing starts. */
export interface LocalUpload {
  id: string;
  fileName: string;
  bytes: number;
  state: 'waiting' | 'uploading' | 'sent' | 'failed';
  /** 0 to 1. */
  progress: number;
  startedAt: number;
}

export interface FileToUpload {
  file: File;
  format: FileFormat;
}

@Service()
export class UploadService {
  private readonly api = inject(UPLOADS_API);
  private readonly uploads = signal<LocalUpload[]>([]);
  private readonly waiting = new Map<string, FileToUpload>();

  readonly local = this.uploads.asReadonly();
  readonly activeCount = computed(
    () =>
      this.uploads().filter(
        (u) => u.state === 'waiting' || u.state === 'uploading',
      ).length,
  );

  constructor() {
    warnBeforeLeaving(() => this.activeCount() > 0);
  }

  /** Checks each file as processing would, says why any is refused, and uploads the rest. */
  async add(files: readonly File[]): Promise<void> {
    const accepted: FileToUpload[] = [];
    for (const file of files) {
      const check = await checkFile(file);
      if ('format' in check) accepted.push({ file, format: check.format });
      else
        toast.error(`${file.name} wasn't uploaded`, {
          description: REFUSAL_MESSAGES[check.refusal],
        });
    }
    this.start(accepted);
  }

  start(files: readonly FileToUpload[]): void {
    const added = files.map((toUpload): LocalUpload => {
      const id = this.api.newId();
      this.waiting.set(id, toUpload);
      return {
        id,
        fileName: toUpload.file.name,
        bytes: toUpload.file.size,
        state: 'waiting',
        progress: 0,
        startedAt: Date.now(),
      };
    });
    this.uploads.update((uploads) => [...uploads, ...added]);
    this.startWaiting();
  }

  /** Forgets a file's row once its record is cleared, or a failed send is dismissed. */
  forget(id: string): void {
    this.uploads.update((uploads) => uploads.filter((u) => u.id !== id));
  }

  private startWaiting(): void {
    const uploading = this.uploads().filter(
      (u) => u.state === 'uploading',
    ).length;
    const next = this.uploads()
      .filter((u) => u.state === 'waiting')
      .slice(0, Math.max(0, MAX_PARALLEL_UPLOADS - uploading));
    for (const upload of next) void this.send(upload.id);
  }

  private async send(id: string): Promise<void> {
    const toUpload = this.waiting.get(id);
    if (!toUpload) return;
    this.waiting.delete(id);
    this.set(id, { state: 'uploading' });
    const { file, format } = toUpload;
    const running = this.api.upload(
      uploadPaths.source(id),
      file,
      {
        contentType: FORMATS[format].mime,
        customMetadata: { fileName: file.name },
      },
      (progress) => this.set(id, { progress }),
    );
    try {
      await running.done;
      this.set(id, { state: 'sent', progress: 1 });
    } catch {
      this.set(id, { state: 'failed' });
    }
    this.startWaiting();
  }

  private set(id: string, changes: Partial<LocalUpload>): void {
    this.uploads.update((uploads) =>
      uploads.map((u) => (u.id === id ? { ...u, ...changes } : u)),
    );
  }
}

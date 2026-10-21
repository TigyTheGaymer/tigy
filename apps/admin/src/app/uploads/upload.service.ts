import {
  computed,
  DOCUMENT,
  effect,
  inject,
  Service,
  signal,
} from '@angular/core';
import { uploadPaths } from '@tigy/models';
import { IMAGE_FORMATS, type ImageFormat } from '@tigy/uploads';
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
  format: ImageFormat;
}

@Service()
export class UploadService {
  private readonly api = inject(UPLOADS_API);
  private readonly view = inject(DOCUMENT).defaultView;
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
    effect((onCleanup) => {
      const view = this.view;
      if (!view || this.activeCount() === 0) return;
      // The browser shows its own "Leave site?" dialog.
      const warn = (event: BeforeUnloadEvent) => event.preventDefault();
      view.addEventListener('beforeunload', warn);
      onCleanup(() => view.removeEventListener('beforeunload', warn));
    });
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
        contentType: IMAGE_FORMATS[format].mime,
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

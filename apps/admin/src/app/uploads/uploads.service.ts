import {
  DestroyRef,
  inject,
  resource,
  Service,
  signal,
  type ResourceRef,
  type ResourceStreamItem,
} from '@angular/core';
import type { Upload, WithId } from '@tigy/models';
import { UploadService } from './upload.service';
import { UPLOADS_API } from './uploads-api';

export const LISTED_UPLOADS = 100;

@Service()
export class UploadsService {
  private readonly api = inject(UPLOADS_API);
  private readonly upload = inject(UploadService);
  private readonly clock = signal(Date.now());

  /** Ticks every 30 seconds, so a record that runs out of time shows as failed without a reload. */
  readonly now = this.clock.asReadonly();

  constructor() {
    const timer = setInterval(() => this.clock.set(Date.now()), 30_000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  list(): ResourceRef<WithId<Upload>[]> {
    return resource({
      defaultValue: [],
      stream: async ({ abortSignal }) => {
        const records = signal<ResourceStreamItem<WithId<Upload>[]>>({
          value: [],
        });
        const stop = this.api.watchUploads(
          LISTED_UPLOADS,
          (value) => records.set({ value }),
          (error) => records.set({ error }),
        );
        abortSignal.addEventListener('abort', stop);
        return records;
      },
    });
  }

  /** Deletes the record; a function then removes what processing left behind, never the artwork. */
  async clear(id: string): Promise<void> {
    await this.api.deleteRecord(id);
    this.upload.forget(id);
  }

  thumbnailUrl(id: string): Promise<string> {
    return this.api.thumbnailUrl(id);
  }
}

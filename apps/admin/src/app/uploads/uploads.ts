import { Component, computed, inject } from '@angular/core';
import { toast } from '@spartan-ng/brain/sonner';
import { HlmEmptyImports } from '@spartan-ng/helm/empty';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideImages } from '@ng-icons/lucide';
import { PageHeader } from '../chrome/page-header';
import { DropZone } from './drop-zone/drop-zone';
import { listUploads } from './upload-list';
import { UploadRow } from './upload-row/upload-row';
import { UploadService } from './upload.service';
import { UploadsService } from './uploads.service';

@Component({
  selector: 'app-uploads',
  imports: [DropZone, PageHeader, UploadRow, HlmEmptyImports, NgIcon],
  providers: [provideIcons({ lucideImages })],
  templateUrl: './uploads.html',
})
export class UploadsPage {
  private readonly upload = inject(UploadService);
  private readonly uploads = inject(UploadsService);

  protected readonly records = this.uploads.list();
  protected readonly rows = computed(() =>
    listUploads(this.upload.local(), this.records.value(), this.uploads.now()),
  );

  protected add(files: File[]): Promise<void> {
    return this.upload.add(files);
  }

  protected async clear(id: string): Promise<void> {
    try {
      await this.uploads.clear(id);
    } catch {
      toast.error("The row couldn't be cleared. Try again.");
    }
  }
}

import { Component, computed, inject } from '@angular/core';
import { toast } from '@spartan-ng/brain/sonner';
import { HlmEmptyImports } from '@spartan-ng/helm/empty';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideImages } from '@ng-icons/lucide';
import { checkFile, REFUSAL_MESSAGES } from './check-file';
import { DropZone } from './drop-zone/drop-zone';
import { listUploads } from './upload-list';
import { UploadRow } from './upload-row/upload-row';
import { UploadService, type FileToUpload } from './upload.service';
import { UploadsService } from './uploads.service';

@Component({
  selector: 'app-uploads',
  imports: [DropZone, UploadRow, HlmEmptyImports, NgIcon],
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

  protected async add(files: File[]): Promise<void> {
    const accepted: FileToUpload[] = [];
    for (const file of files) {
      const check = await checkFile(file);
      if ('format' in check) accepted.push({ file, format: check.format });
      else
        toast.error(`${file.name} wasn't uploaded`, {
          description: REFUSAL_MESSAGES[check.refusal],
        });
    }
    this.upload.start(accepted);
  }

  protected async clear(id: string): Promise<void> {
    try {
      await this.uploads.clear(id);
    } catch {
      toast.error("The row couldn't be cleared. Try again.");
    }
  }
}

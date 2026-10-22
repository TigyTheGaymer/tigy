import { Component, computed, input, output } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideTriangleAlert, lucideX } from '@ng-icons/lucide';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmProgressImports } from '@spartan-ng/helm/progress';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import type { UploadListItem } from '../../uploads/upload-list';
import { FAILURE_MESSAGES } from '../../uploads/upload-row/upload-row';

/** Files still uploading or processing, and failed ones; a ready file shows as its artwork instead. */
@Component({
  selector: 'app-upload-tiles',
  imports: [HlmButtonImports, HlmProgressImports, HlmSpinnerImports, NgIcon],
  providers: [provideIcons({ lucideTriangleAlert, lucideX })],
  templateUrl: './upload-tiles.html',
})
export class UploadTiles {
  readonly rows = input.required<UploadListItem[]>();
  readonly dismiss = output<string>();

  protected readonly tiles = computed(() =>
    this.rows()
      .filter((row) => row.status !== 'ready')
      .map((row) => ({
        ...row,
        percent: Math.round((row.progress ?? 0) * 100),
        reason: row.reason ? FAILURE_MESSAGES[row.reason] : '',
      })),
  );
}

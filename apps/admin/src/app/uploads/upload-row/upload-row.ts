import { Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideImage, lucideTrash2 } from '@ng-icons/lucide';
import { HlmAlertDialogImports } from '@spartan-ng/helm/alert-dialog';
import { HlmBadgeImports, type BadgeVariants } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmProgressImports } from '@spartan-ng/helm/progress';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { fileDuration, fileSize, formatName } from '@tigy/gallery';
import { imagePaths, isVideoFile } from '@tigy/models';
import { storageUrl } from '../../firebase/storage-url';
import {
  isClearable,
  type UploadListStatus,
  type FailureReason,
  type UploadListItem,
} from '../upload-list';

export const FAILURE_MESSAGES: Record<FailureReason, string> = {
  unsupported: 'Only JPEG, PNG, GIF, WebP, MP4, MOV and WebM are supported.',
  damaged: 'The file is damaged. Export it again and upload the new file.',
  'too-large':
    'The picture is too large to process (over 1 billion pixels, counting every frame). Make it smaller and upload it again.',
  'file-too-large':
    'The file is too large: the limit for images is 50 MB and for videos 200 MB.',
  'video-too-long':
    'Videos may be at most 3 minutes long. Shorten it and upload it again.',
  'video-too-large':
    'Videos may be at most 3840 × 2160 pixels. Make it smaller and upload it again.',
  unreadable:
    'The file could not be read. Export it again, as H.264 or VP9, and upload the new file.',
  internal: 'Processing failed. Upload the file again.',
  'too-long': 'Processing took too long. Upload the file again.',
  'not-sent': "The upload didn't finish. Upload the file again.",
};

const STATUS_LABELS: Record<UploadListStatus, string> = {
  uploading: 'Uploading',
  processing: 'Processing',
  ready: 'Ready',
  failed: 'Failed',
};

const BADGE_VARIANTS: Record<UploadListStatus, BadgeVariants['variant']> = {
  uploading: 'secondary',
  processing: 'secondary',
  ready: 'default',
  failed: 'destructive',
};

@Component({
  selector: 'app-upload-row',
  imports: [
    HlmAlertDialogImports,
    HlmBadgeImports,
    HlmButtonImports,
    HlmProgressImports,
    HlmSpinnerImports,
    HlmTooltipImports,
    NgIcon,
    RouterLink,
  ],
  providers: [provideIcons({ lucideImage, lucideTrash2 })],
  templateUrl: './upload-row.html',
})
export class UploadRow {
  readonly row = input.required<UploadListItem>();
  readonly clear = output<void>();

  protected readonly label = computed(() => STATUS_LABELS[this.row().status]);
  protected readonly badgeVariant = computed(
    () => BADGE_VARIANTS[this.row().status],
  );
  protected readonly percent = computed(() =>
    Math.round((this.row().progress ?? 0) * 100),
  );
  protected readonly reason = computed(() => {
    const reason = this.row().reason;
    return reason ? FAILURE_MESSAGES[reason] : null;
  });
  protected readonly details = computed(() => {
    const file = this.row().file;
    if (!file) return null;
    return fileDetails(file);
  });
  protected readonly isClearable = computed(() => isClearable(this.row()));
  protected readonly thumbnail = computed(() =>
    this.row().status === 'ready'
      ? storageUrl(imagePaths.thumb(this.row().id))
      : null,
  );
}

/** "PNG, animated, 500 × 500, 820 KB", "MP4 video, 1080 × 1920, 0:42, 12.3 MB". */
export function fileDetails(file: NonNullable<UploadListItem['file']>): string {
  const kind = isVideoFile(file)
    ? formatName(file.mime)
    : formatName(file.mime) + (file.animated ? ', animated' : '');
  const duration = fileDuration(file);
  return [
    kind,
    `${file.w} × ${file.h}`,
    ...(duration ? [duration] : []),
    fileSize(file.bytes),
  ].join(', ');
}

import { Component, output, signal } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideImageUp } from '@ng-icons/lucide';

/** Takes files dropped on it or picked; checking them is the page's job. */
@Component({
  selector: 'app-drop-zone',
  imports: [NgIcon],
  providers: [provideIcons({ lucideImageUp })],
  host: {
    // A file dropped next to the zone would make the browser open it and leave the admin.
    '(document:dragover)': '$event.preventDefault()',
    '(document:drop)': '$event.preventDefault()',
  },
  template: `
    <label
      class="hover:bg-muted/50 focus-within:ring-ring/50 flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-colors focus-within:ring-3"
      [class.border-primary]="isDragging()"
      [class.bg-muted]="isDragging()"
      (dragover)="onDragOver($event)"
      (dragleave)="onDragLeave($event)"
      (drop)="onDrop($event)"
    >
      <ng-icon
        name="lucideImageUp"
        class="text-muted-foreground text-[length:--spacing(8)]"
      />
      <span class="font-medium">Drop pictures here, or choose files</span>
      <span class="text-muted-foreground text-sm">
        JPEG, PNG, GIF or WebP, up to 50 MB each
      </span>
      <input
        type="file"
        multiple
        accept="image/*"
        class="sr-only"
        (change)="onPick($event)"
      />
    </label>
  `,
})
export class DropZone {
  readonly files = output<File[]>();
  protected readonly isDragging = signal(false);

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    this.isDragging.set(true);
  }

  protected onDragLeave(event: DragEvent): void {
    // Moving over the zone's own text also fires dragleave.
    const zone = event.currentTarget as HTMLElement;
    if (!zone.contains(event.relatedTarget as Node | null)) {
      this.isDragging.set(false);
    }
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(false);
    const files = [...(event.dataTransfer?.files ?? [])];
    if (files.length) this.files.emit(files);
  }

  protected onPick(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = [...(input.files ?? [])];
    // Picking the same file again should start another upload.
    input.value = '';
    if (files.length) this.files.emit(files);
  }
}

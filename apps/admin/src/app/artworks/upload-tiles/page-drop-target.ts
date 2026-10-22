import { Component, output, signal } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideImageUp } from '@ng-icons/lucide';

const hasFiles = (event: DragEvent) =>
  event.dataTransfer?.types.includes('Files') ?? false;

/** Takes files dropped anywhere on the page; drags without files, such as a tile or text, pass through. */
@Component({
  selector: 'app-page-drop-target',
  imports: [NgIcon],
  providers: [provideIcons({ lucideImageUp })],
  host: {
    '(document:dragenter)': 'onDragEnter($event)',
    '(document:dragover)': 'onDragOver($event)',
    '(document:dragleave)': 'onDragLeave($event)',
    '(document:drop)': 'onDrop($event)',
  },
  template: `
    @if (isDragging()) {
      <div
        class="bg-background/80 border-primary pointer-events-none fixed inset-2 z-50 grid place-items-center rounded-xl border-4 border-dashed backdrop-blur-sm"
      >
        <div class="grid justify-items-center gap-2 text-center">
          <ng-icon name="lucideImageUp" class="text-[length:--spacing(10)]" />
          <span class="text-lg font-semibold">Drop to upload</span>
        </div>
      </div>
    }
  `,
})
export class PageDropTarget {
  readonly files = output<File[]>();
  protected readonly isDragging = signal(false);
  // dragenter and dragleave fire for every element crossed on the way.
  private depth = 0;

  protected onDragEnter(event: DragEvent): void {
    if (!hasFiles(event)) return;
    event.preventDefault();
    this.depth++;
    this.isDragging.set(true);
  }

  protected onDragOver(event: DragEvent): void {
    if (!hasFiles(event)) return;
    // Without this the browser would open a dropped file and leave the admin.
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
  }

  protected onDragLeave(event: DragEvent): void {
    if (!hasFiles(event)) return;
    this.depth = Math.max(0, this.depth - 1);
    if (!this.depth) this.isDragging.set(false);
  }

  protected onDrop(event: DragEvent): void {
    if (!hasFiles(event)) return;
    event.preventDefault();
    this.depth = 0;
    this.isDragging.set(false);
    const files = [...(event.dataTransfer?.files ?? [])];
    if (files.length) this.files.emit(files);
  }
}

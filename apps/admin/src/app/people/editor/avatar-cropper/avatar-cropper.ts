import { Component, computed, input, model } from '@angular/core';
import type { DecodedPicture } from './avatar-canvas';
import { MAX_ZOOM, pan, side, zoomAround, type Crop } from './crop';

/** Shown size of the square frame, in CSS pixels. */
export const FRAME = 288;

/** A square frame over the picture: drag or pinch to move it, wheel, slider or pinch to zoom. */
@Component({
  selector: 'app-avatar-cropper',
  templateUrl: './avatar-cropper.html',
})
export class AvatarCropper {
  readonly picture = input.required<DecodedPicture>();
  readonly crop = model.required<Crop>();

  protected readonly frame = FRAME;
  protected readonly maxZoom = MAX_ZOOM;
  private readonly pointers = new Map<number, { x: number; y: number }>();

  protected readonly transform = computed(() => {
    const crop = this.crop();
    const scale = FRAME / side(crop);
    const left = crop.cx - side(crop) / 2;
    const top = crop.cy - side(crop) / 2;
    return `scale(${scale}) translate(${-left}px, ${-top}px)`;
  });

  protected setZoom(zoom: number): void {
    this.crop.update((crop) =>
      zoomAround(crop, zoom, FRAME / 2, FRAME / 2, FRAME),
    );
  }

  protected onPointerDown(event: PointerEvent): void {
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  }

  protected onPointerMove(event: PointerEvent): void {
    const last = this.pointers.get(event.pointerId);
    if (!last) return;
    const now = { x: event.clientX, y: event.clientY };
    if (this.pointers.size === 1) {
      this.crop.update((crop) =>
        pan(crop, now.x - last.x, now.y - last.y, FRAME),
      );
    } else if (this.pointers.size === 2) {
      const other = [...this.pointers].find(
        ([id]) => id !== event.pointerId,
      )?.[1];
      if (other) this.pinch(event, last, now, other);
    }
    this.pointers.set(event.pointerId, now);
  }

  protected onPointerUp(event: PointerEvent): void {
    this.pointers.delete(event.pointerId);
  }

  protected onWheel(event: WheelEvent): void {
    event.preventDefault();
    const { fx, fy } = this.inFrame(event, event.clientX, event.clientY);
    this.crop.update((crop) =>
      zoomAround(
        crop,
        crop.zoom * Math.exp(-event.deltaY * 0.002),
        fx,
        fy,
        FRAME,
      ),
    );
  }

  /** Zooms by how much farther apart the two fingers are, around their midpoint. */
  private pinch(
    event: PointerEvent,
    last: { x: number; y: number },
    now: { x: number; y: number },
    other: { x: number; y: number },
  ): void {
    const before = Math.hypot(last.x - other.x, last.y - other.y);
    const after = Math.hypot(now.x - other.x, now.y - other.y);
    if (!before) return;
    const { fx, fy } = this.inFrame(
      event,
      (now.x + other.x) / 2,
      (now.y + other.y) / 2,
    );
    this.crop.update((crop) =>
      zoomAround(crop, crop.zoom * (after / before), fx, fy, FRAME),
    );
  }

  private inFrame(event: Event, x: number, y: number) {
    const box = (event.currentTarget as HTMLElement).getBoundingClientRect();
    return { fx: x - box.left, fy: y - box.top };
  }
}

import {
  afterNextRender,
  Component,
  DestroyRef,
  computed,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideMaximize,
  lucideMinus,
  lucidePlus,
  lucideX,
} from '@ng-icons/lucide';

const MAX_SCALE = 8;

/** Opens at once on the image the page already has, then swaps in the original for zooming. */
@Component({
  selector: 'app-full-view',
  imports: [NgIcon],
  providers: [
    provideIcons({ lucideMaximize, lucideMinus, lucidePlus, lucideX }),
  ],
  templateUrl: './full-view.html',
  styleUrl: './full-view.css',
  host: { '(keydown)': 'onKey($event)' },
})
export class FullView {
  /** The image the page already shows. */
  readonly fullSrc = input.required<string>();
  readonly originalSrc = input.required<string>();
  readonly alt = input('');
  readonly closed = output<void>();

  private readonly original = signal<string | undefined>(undefined);
  protected readonly src = computed(() => this.original() ?? this.fullSrc());

  protected readonly isShown = signal(false);
  protected readonly isDragging = signal(false);
  protected readonly isAnimated = signal(false);
  private readonly scale = signal(1);
  private readonly x = signal(0);
  private readonly y = signal(0);
  protected readonly isZoomed = computed(() => this.scale() > 1.001);
  protected readonly zoomLabel = computed(() =>
    this.isZoomed() ? `${Math.round(this.scale() * 100)}%` : 'Fit',
  );
  protected readonly transform = computed(
    () => `translate(${this.x()}px, ${this.y()}px) scale(${this.scale()})`,
  );

  private readonly dialog =
    viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly stage = viewChild.required<ElementRef<HTMLElement>>('stage');
  private readonly image =
    viewChild.required<ElementRef<HTMLImageElement>>('image');

  private readonly pointers = new Map<number, { x: number; y: number }>();
  private last: { x: number; y: number } | undefined;
  private pinch: { distance: number; scale: number } | undefined;
  private isDestroyed = false;

  constructor() {
    inject(DestroyRef).onDestroy(() => (this.isDestroyed = true));
    afterNextRender(() => {
      this.dialog().nativeElement.showModal();
      this.isShown.set(true);
      const original = new Image();
      original.onload = () => this.original.set(this.originalSrc());
      original.src = this.originalSrc();
    });
  }

  protected zoomBy(
    factor: number,
    clientX?: number,
    clientY?: number,
    isAnimated = true,
  ): void {
    const rect = this.stage().nativeElement.getBoundingClientRect();
    const px =
      (clientX ?? rect.left + rect.width / 2) - (rect.left + rect.width / 2);
    const py =
      (clientY ?? rect.top + rect.height / 2) - (rect.top + rect.height / 2);
    const scale = Math.min(MAX_SCALE, Math.max(1, this.scale() * factor));
    const ratio = scale / this.scale();
    this.x.set(px - (px - this.x()) * ratio);
    this.y.set(py - (py - this.y()) * ratio);
    this.scale.set(scale);
    this.apply(isAnimated);
  }

  protected fit(): void {
    this.scale.set(1);
    this.x.set(0);
    this.y.set(0);
    this.apply(true);
  }

  /** The browser closes the dialog first (Escape, close button) and returns focus; only then does the page remove it. */
  protected onClosed(): void {
    if (!this.isDestroyed) this.closed.emit();
  }

  protected onWheel(event: WheelEvent): void {
    event.preventDefault();
    this.zoomBy(
      Math.exp(-event.deltaY * 0.0018),
      event.clientX,
      event.clientY,
      false,
    );
  }

  protected onPointerDown(event: PointerEvent): void {
    this.stage().nativeElement.setPointerCapture(event.pointerId);
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    this.last = { x: event.clientX, y: event.clientY };
    if (this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()];
      this.pinch = {
        distance: Math.hypot(a.x - b.x, a.y - b.y),
        scale: this.scale(),
      };
    }
    this.isDragging.set(true);
  }

  protected onPointerMove(event: PointerEvent): void {
    if (!this.pointers.has(event.pointerId)) return;
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const last = this.last;
    if (this.pointers.size === 2 && this.pinch) {
      const [a, b] = [...this.pointers.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      this.zoomBy(
        (this.pinch.scale * (distance / this.pinch.distance)) / this.scale(),
        (a.x + b.x) / 2,
        (a.y + b.y) / 2,
        false,
      );
    } else if (this.pointers.size === 1 && last) {
      this.x.update((x) => x + event.clientX - last.x);
      this.y.update((y) => y + event.clientY - last.y);
      this.last = { x: event.clientX, y: event.clientY };
      this.apply(false);
    }
  }

  protected onPointerUp(event: PointerEvent): void {
    this.pointers.delete(event.pointerId);
    if (this.pointers.size < 2) this.pinch = undefined;
    if (this.pointers.size === 0) {
      this.last = undefined;
      this.isDragging.set(false);
    }
  }

  protected onDoubleClick(event: MouseEvent): void {
    if (this.isZoomed()) this.fit();
    else this.zoomBy(2.5, event.clientX, event.clientY);
  }

  protected onKey(event: KeyboardEvent): void {
    if (event.key === '+' || event.key === '=') this.zoomBy(1.5);
    else if (event.key === '-') this.zoomBy(1 / 1.5);
    else if (event.key === '0') this.fit();
  }

  /** Keeps the zoomed piece covering the screen it can cover. */
  private apply(isAnimated: boolean): void {
    const image = this.image().nativeElement;
    const stage = this.stage().nativeElement;
    const maxX = Math.max(
      0,
      (image.offsetWidth * this.scale() - stage.clientWidth) / 2,
    );
    const maxY = Math.max(
      0,
      (image.offsetHeight * this.scale() - stage.clientHeight) / 2,
    );
    this.x.set(Math.min(maxX, Math.max(-maxX, this.x())));
    this.y.set(Math.min(maxY, Math.max(-maxY, this.y())));
    this.isAnimated.set(isAnimated);
  }
}

import {
  afterNextRender,
  Component,
  computed,
  DOCUMENT,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import type { YearMark } from '@tigy/gallery';

export interface YearPosition {
  year: number;
  /** Where the year's first piece sits along the gallery, 0 to 1. */
  at: number;
  /** The index of that piece in gallery order. */
  index: number;
}

// Labels closer than this share of the tail would overlap.
const LABEL_GAP = 0.035;

/** Year marks in gallery order (`years` already sorted that way), spaced so labels never overlap. */
export function yearPositions(years: readonly YearMark[]): YearPosition[] {
  const total = years.reduce((sum, year) => sum + year.count, 0);
  let index = 0;
  let last = -Infinity;
  return years.map(({ year, count }) => {
    const at = Math.max(total ? index / total : 0, last + LABEL_GAP);
    const position = { year, at: Math.min(at, 1), index };
    last = at;
    index += count;
    return position;
  });
}

/** Spans the whole filtered gallery, loaded or not; the page loads pages until a chosen piece arrives. */
@Component({
  selector: 'app-tail-timeline',
  styleUrl: './tail-timeline.css',
  host: {
    'aria-hidden': 'true',
    '(window:scroll)': 'measure()',
    '(window:resize)': 'measure()',
  },
  template: `
    <div
      #timeline
      class="timeline"
      [class.is-dragging]="isDragging()"
      [style.--p]="progress()"
      (pointerdown)="start($event)"
      (pointermove)="move($event)"
      (pointerup)="isDragging.set(false)"
      (pointercancel)="isDragging.set(false)"
    >
      <span class="track"></span>
      <span class="fill"></span>
      @for (mark of marks(); track mark.year) {
        <span class="year" [style.top.%]="mark.at * 100">{{ mark.year }}</span>
      }
    </div>
    <div class="phone-tail" [style.--p]="progress()"></div>
  `,
})
export class TailTimeline {
  /** Matching pieces per year, in gallery order. */
  readonly years = input.required<readonly YearMark[]>();
  /** How many pieces are loaded so far. */
  readonly loaded = input.required<number>();
  /** The index of the piece to bring into view. */
  readonly travel = output<number>();

  protected readonly marks = computed(() => yearPositions(this.years()));
  protected readonly isDragging = signal(false);
  private readonly scrolled = signal(0);
  private readonly total = computed(() =>
    this.years().reduce((sum, year) => sum + year.count, 0),
  );
  /** How far through the whole gallery the visitor has scrolled. */
  protected readonly progress = computed(() => {
    const total = this.total();
    return total ? this.scrolled() * Math.min(1, this.loaded() / total) : 0;
  });

  private readonly timeline =
    viewChild.required<ElementRef<HTMLElement>>('timeline');
  private readonly document = inject(DOCUMENT);

  constructor() {
    afterNextRender(() => this.measure());
  }

  protected measure(): void {
    const view = this.document.defaultView;
    if (!view) return;
    const max = this.document.documentElement.scrollHeight - view.innerHeight;
    this.scrolled.set(max > 0 ? Math.min(1, view.scrollY / max) : 1);
  }

  protected start(event: PointerEvent): void {
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    this.isDragging.set(true);
    this.goTo(event);
  }

  protected move(event: PointerEvent): void {
    if (this.isDragging()) this.goTo(event);
  }

  private goTo(event: PointerEvent): void {
    const rect = this.timeline().nativeElement.getBoundingClientRect();
    const ratio = Math.min(
      1,
      Math.max(0, (event.clientY - rect.top) / rect.height),
    );
    const index = Math.min(this.total() - 1, Math.floor(ratio * this.total()));
    if (index >= 0) this.travel.emit(index);
  }
}

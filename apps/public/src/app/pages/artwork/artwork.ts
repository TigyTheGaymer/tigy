import {
  Component,
  computed,
  DOCUMENT,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  LucideArrowLeft,
  LucideArrowRight,
  LucideDownload,
  LucideExpand,
  LucideInfo,
  LucideShare2,
} from '@lucide/angular';
import { CatalogService, isNotFound } from '../../catalog/catalog.service';
import { StageBar } from '../../chrome/stage-bar';
import { HeadService } from '../../head/head.service';
import { Paw } from '../../markings/paw';
import { ConfirmedPiecesService } from '../../nsfw/confirmed-pieces.service';
import { NsfwSwitchService } from '../../nsfw/nsfw-switch.service';
import { latest } from '../../resources';
import { injectServerResponse } from '../../server-response';
import { artworkPath, fullImageUrl, originalUrl } from '../../urls';
import { NotFoundPage } from '../not-found/not-found';
import { CreditsPanel } from './credits-panel';
import { CreditsPanelService } from './credits-panel.service';
import { FullView } from './full-view';

/** At this width and below, the credits sit under the stage instead of beside it. */
const STACKED_WIDTH = 1100;
const SWIPE_DISTANCE = 60;

@Component({
  selector: 'app-artwork',
  imports: [
    RouterLink,
    LucideArrowLeft,
    LucideArrowRight,
    LucideDownload,
    LucideExpand,
    LucideInfo,
    LucideShare2,
    StageBar,
    Paw,
    NotFoundPage,
    CreditsPanel,
    FullView,
  ],
  templateUrl: './artwork.html',
  styleUrl: './artwork.css',
  host: { '(document:keydown)': 'onKey($event)' },
})
export class ArtworkPage {
  /** Empty until the router sets it. */
  readonly id = input('');
  /** Present (empty) on safe links, which preview only the site card. */
  readonly safe = input<string>();

  private readonly catalog = inject(CatalogService);
  private readonly router = inject(Router);
  private readonly head = inject(HeadService);
  private readonly document = inject(DOCUMENT);
  private readonly nsfwSwitch = inject(NsfwSwitchService);
  private readonly confirmedPieces = inject(ConfirmedPiecesService);
  protected readonly creditsPanel = inject(CreditsPanelService);

  private readonly resource = this.catalog.artwork(() =>
    this.id()
      ? { id: this.id(), includeNsfw: this.nsfwSwitch.isOn() }
      : undefined,
  );

  /** Keeps this piece's details while the NSFW-inclusive neighbours load. */
  protected readonly data = latest(
    this.resource,
    (previous) => previous.artwork.id === this.id(),
  );

  protected readonly isMissing = computed(
    () => !this.data() && isNotFound(this.resource.error()),
  );
  protected readonly hasFailed = computed(
    () => !this.data() && !this.isMissing() && !!this.resource.error(),
  );

  protected readonly isImageShown = computed(() => {
    const artwork = this.data()?.artwork;
    return (
      !!artwork &&
      (!artwork.nsfw ||
        this.nsfwSwitch.isOn() ||
        this.confirmedPieces.has(artwork.id))
    );
  });

  protected readonly title = computed(
    () => this.data()?.artwork.title ?? 'Untitled',
  );
  protected readonly fullImage = computed(() => fullImageUrl(this.id()));
  protected readonly originalHref = computed(() => {
    const artwork = this.data()?.artwork;
    return artwork ? originalUrl(artwork.id, artwork.file.original) : '';
  });

  protected readonly isFullViewOpen = signal(false);
  protected readonly toast = signal('');
  private toastTimer: ReturnType<typeof setTimeout> | undefined;
  private fullViewOpener: HTMLElement | null = null;
  private swipeStart: { x: number; y: number } | undefined;

  private readonly stageBar = viewChild(StageBar);

  constructor() {
    const response = injectServerResponse();
    effect(() => {
      if (this.hasFailed()) response.unavailable();
    });

    effect(() => {
      const data = this.data();
      if (!data) return;
      if (this.safe() !== undefined) {
        this.head.siteCard({ isHiddenFromSearch: data.artwork.nsfw });
      } else {
        this.head.artwork(data);
      }
    });
  }

  protected showPiece(): void {
    const artwork = this.data()?.artwork;
    if (artwork) this.confirmedPieces.add(artwork.id);
  }

  protected showAll(): void {
    this.nsfwSwitch.set(true);
  }

  protected toggleCredits(): void {
    if (window.innerWidth <= STACKED_WIDTH) {
      const isMotionReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.document
        .getElementById('credits')
        ?.scrollIntoView({ behavior: isMotionReduced ? 'auto' : 'smooth' });
      return;
    }
    this.creditsPanel.set(!this.creditsPanel.isOpen());
  }

  protected openFullView(): void {
    this.fullViewOpener = this.document.activeElement as HTMLElement | null;
    this.isFullViewOpen.set(true);
  }

  protected closeFullView(): void {
    this.isFullViewOpen.set(false);
    this.fullViewOpener?.focus();
  }

  protected async share(): Promise<void> {
    const url = this.head.url(artworkPath(this.id()));
    if (navigator.share) {
      try {
        await navigator.share({ title: this.title(), url });
      } catch {
        // Cancelled.
      }
      return;
    }
    this.showToast(
      (await copy(url)) ? 'Link copied!' : 'Couldn’t copy the link',
    );
  }

  protected async copySafeLink(): Promise<void> {
    const url = this.head.url(`${artworkPath(this.id())}?safe`);
    this.showToast(
      (await copy(url)) ? 'Safe link copied!' : 'Couldn’t copy the link',
    );
  }

  protected onKey(event: KeyboardEvent): void {
    if (this.isFullViewOpen() || event.defaultPrevented) return;
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest('input, textarea, select')) return;
    if (event.key === 'ArrowLeft') this.go(this.data()?.previous?.id);
    else if (event.key === 'ArrowRight') this.go(this.data()?.next?.id);
    else if (event.key === 'Escape') this.stageBar()?.goBack();
  }

  protected onTouchStart(event: TouchEvent): void {
    if (event.touches.length !== 1) return;
    this.swipeStart = { x: event.touches[0].clientX, y: event.touches[0].clientY };
  }

  protected onTouchEnd(event: TouchEvent): void {
    const start = this.swipeStart;
    this.swipeStart = undefined;
    if (!start || this.isFullViewOpen()) return;
    const dx = event.changedTouches[0].clientX - start.x;
    const dy = event.changedTouches[0].clientY - start.y;
    if (Math.abs(dx) < SWIPE_DISTANCE || Math.abs(dy) > Math.abs(dx) * 0.7) {
      return;
    }
    this.go(dx > 0 ? this.data()?.previous?.id : this.data()?.next?.id);
  }

  /** Moving between pieces replaces the history entry, so going back returns to the gallery. */
  private go(id: string | undefined): void {
    if (id) void this.router.navigate(['/i', id], { replaceUrl: true });
  }

  private showToast(text: string): void {
    this.toast.set(text);
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toast.set(''), 2200);
  }
}

async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

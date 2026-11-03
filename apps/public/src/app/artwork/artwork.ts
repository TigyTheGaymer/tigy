import {
  afterRenderEffect,
  Component,
  computed,
  DestroyRef,
  DOCUMENT,
  effect,
  ElementRef,
  inject,
  input,
  linkedSignal,
  signal,
  type Signal,
  untracked,
  viewChild,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideArrowLeft,
  lucideArrowRight,
  lucideDownload,
  lucideExpand,
  lucideInfo,
  lucideShare2,
} from '@ng-icons/lucide';
import { stopVideo } from '@tigy/gallery';
import { isVideoFile } from '@tigy/models';
import type { NeighbourLink } from '../../api/types';
import { CatalogService, isNotFound } from '../catalog/catalog.service';
import { StageBar } from '../chrome/stage-bar';
import { HeadService } from '../head/head.service';
import { injectServerResponse } from '../head/server-response';
import { Paw } from '../markings/paw';
import { NotFoundPage } from '../not-found/not-found';
import { AgeCheckService } from '../nsfw/age-check.service';
import { ConfirmedPiecesService } from '../nsfw/confirmed-pieces.service';
import { NsfwSwitchService } from '../nsfw/nsfw-switch.service';
import { pieceTitle } from '../shared/format';
import { MotionPreferenceService } from '../shared/motion-preference.service';
import { shapeOf } from '../shared/shape';
import {
  artworkPath,
  fullImageUrl,
  originalUrl,
  videoUrl,
} from '../shared/urls';
import { CreditsPanel } from './credits-panel/credits-panel';
import { CreditsPanelService } from './credits-panel/credits-panel.service';
import { FullView } from './full-view/full-view';
import { PieceTitlePipe } from './piece-title.pipe';
import { shownPiece } from './shown-piece';
import { Skeleton } from './skeleton/skeleton';

/** artwork.css's breakpoint: at this width and below, the credits sit under the stage. */
const STACKED_WIDTH = 1100;
const SWIPE_DISTANCE = 60;
// About the height of the native controls bar at the bottom of a player.
const PLAYER_CONTROLS_HEIGHT = 64;

@Component({
  selector: 'app-artwork',
  imports: [
    PieceTitlePipe,
    RouterLink,
    NgIcon,
    StageBar,
    Paw,
    NotFoundPage,
    CreditsPanel,
    FullView,
    Skeleton,
  ],
  providers: [
    provideIcons({
      lucideArrowLeft,
      lucideArrowRight,
      lucideDownload,
      lucideExpand,
      lucideInfo,
      lucideShare2,
    }),
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
  private readonly ageCheck = inject(AgeCheckService);
  protected readonly creditsPanel = inject(CreditsPanelService);

  private readonly hasNavigated = this.router.navigated;

  private readonly request = computed(() =>
    this.id()
      ? { id: this.id(), includeNsfw: this.nsfwSwitch.isOn() }
      : undefined,
  );
  private readonly resource = this.catalog.artwork(this.request);

  private readonly shown = shownPiece(this.resource.snapshot, this.request);
  protected readonly data = this.shown.piece;
  protected readonly answered = this.shown.answered;
  private readonly answeredId = computed(() => this.answered()?.artwork.id);
  private readonly shownId = computed(() => this.data()?.artwork.id);
  /**
   * False on the piece the visitor landed on: the server sent it finished, and its image can load
   * before hydration could hear about it, so it never counts as waiting.
   */
  private readonly isPastLanding = linkedSignal<string | undefined, boolean>({
    source: this.shownId,
    computation: (_id, previous) =>
      this.hasNavigated || !!previous?.source || !!previous?.value,
  });
  protected readonly isMoving = computed(
    () => !!this.shownId() && this.shownId() !== this.id(),
  );
  private readonly isStagePending = computed(
    () => !!this.answeredId() && this.answeredId() !== this.id(),
  );

  protected readonly isMissing = computed(
    () => !this.data() && isNotFound(this.resource.error()),
  );
  protected readonly hasFailed = computed(
    () => !this.data() && !this.isMissing() && !!this.resource.error(),
  );

  protected readonly isImageShown = computed(() => {
    const artwork = this.answered()?.artwork;
    return (
      !!artwork &&
      (!artwork.nsfw ||
        this.nsfwSwitch.isOn() ||
        this.confirmedPieces.has(artwork.id))
    );
  });

  protected readonly title = computed(() =>
    pieceTitle(this.data()?.artwork.title),
  );
  // From the server's answer, never id(): a file must not load before its piece's NSFW flag is known.
  protected readonly fullImage = computed(() => {
    const id = this.answeredId();
    return id ? fullImageUrl(id) : '';
  });
  protected readonly isVideo = computed(() => {
    const artwork = this.answered()?.artwork;
    return !!artwork && isVideoFile(artwork.file);
  });
  protected readonly video = computed(() => {
    const id = this.answeredId();
    return id ? videoUrl(id) : '';
  });
  protected readonly originalHref = computed(() => {
    const artwork = this.answered()?.artwork;
    return artwork ? originalUrl(artwork) : '';
  });

  // Pointing at the address already open, an arrow does nothing while it keeps its focus.
  protected readonly previousLink = computed(() =>
    this.arrowLink(this.data()?.previous),
  );
  protected readonly nextLink = computed(() =>
    this.arrowLink(this.data()?.next),
  );

  private readonly imageSrc = computed(() =>
    this.isImageShown() && !this.isVideo() ? this.fullImage() : undefined,
  );
  protected readonly isImageWaiting = linkedSignal<string | undefined, boolean>(
    {
      source: this.imageSrc,
      computation: (src) => !!src && this.isPastLanding(),
    },
  );

  protected readonly pieceShape = computed(() => {
    const file = this.answered()?.artwork.file;
    return file ? shapeOf(file) : 1;
  });
  /** An old image stays up until the new one loads, so its box keeps the old shape until then. */
  protected readonly shownShape = linkedSignal<
    { shape: number; isWaiting: boolean; hasImage: boolean },
    number
  >({
    source: () => ({
      shape: this.pieceShape(),
      isWaiting: this.isImageWaiting(),
      hasImage: !!this.imageSrc(),
    }),
    computation: ({ shape, isWaiting }, previous) =>
      isWaiting && previous?.source.hasImage ? previous.value : shape,
  }).asReadonly();

  private readonly hasNothingYet = computed(
    () => this.isPastLanding() && !this.data() && !this.resource.error(),
  );
  protected readonly isStageWaiting = computed(
    () =>
      this.hasNothingYet() || this.isStagePending() || this.isImageWaiting(),
  );
  protected readonly isCreditsWaiting = computed(
    () => this.hasNothingYet() || this.isMoving(),
  );
  protected readonly isStageDelayed = isDelayedWait(
    this.isStageWaiting,
    this.data,
  );
  protected readonly isCreditsDelayed = isDelayedWait(
    this.isCreditsWaiting,
    this.data,
  );

  protected readonly isFullViewOpen = signal(false);
  protected readonly toast = signal('');
  private toastTimer: ReturnType<typeof setTimeout> | undefined;
  private swipeStart: { x: number; y: number } | undefined;

  private readonly stageBar = viewChild(StageBar);
  private readonly player = viewChild<ElementRef<HTMLVideoElement>>('player');
  private readonly creditsWrap =
    viewChild<ElementRef<HTMLElement>>('creditsWrap');

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.toastTimer));
    this.playVideos();
    afterRenderEffect({
      write: () => {
        this.shownId();
        const wrap = this.creditsWrap()?.nativeElement;
        if (wrap) wrap.scrollTop = 0;
      },
    });
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
    if (artwork)
      this.ageCheck.confirm(() => this.confirmedPieces.add(artwork.id));
  }

  protected showAll(): void {
    this.nsfwSwitch.set(true);
  }

  protected openFullView(): void {
    if (!this.isStagePending()) this.isFullViewOpen.set(true);
  }

  protected toggleCredits(): void {
    const view = this.document.defaultView;
    if (view && view.innerWidth <= STACKED_WIDTH) {
      const isMotionReduced = view.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches;
      this.document
        .getElementById('credits')
        ?.scrollIntoView({ behavior: isMotionReduced ? 'auto' : 'smooth' });
      return;
    }
    this.creditsPanel.set(!this.creditsPanel.isOpen());
  }

  protected async share(): Promise<void> {
    const id = this.shownId();
    if (!id) return;
    const url = this.head.url(artworkPath(id));
    const navigator = this.document.defaultView?.navigator;
    if (navigator?.share) {
      try {
        await navigator.share({ title: this.title(), url });
      } catch {
        // Cancelled.
      }
      return;
    }
    this.showToast(
      (await this.copy(url)) ? 'Link copied!' : 'Couldn’t copy the link',
    );
  }

  protected async copySafeLink(): Promise<void> {
    const id = this.shownId();
    if (!id) return;
    const url = this.head.url(`${artworkPath(id)}?safe`);
    this.showToast(
      (await this.copy(url)) ? 'Safe link copied!' : 'Couldn’t copy the link',
    );
  }

  protected onKey(event: KeyboardEvent): void {
    if (this.isFullViewOpen() || event.defaultPrevented) return;
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest('input, textarea, select')) return;
    // A focused player seeks with the arrow keys.
    const isArrow = event.key === 'ArrowLeft' || event.key === 'ArrowRight';
    if (isArrow && target?.closest('video')) return;
    if (event.key === 'ArrowLeft') this.go(this.data()?.previous?.id);
    else if (event.key === 'ArrowRight') this.go(this.data()?.next?.id);
    else if (event.key === 'Escape') this.stageBar()?.goBack();
  }

  protected onTouchStart(event: TouchEvent): void {
    const touch = event.touches[0];
    if (event.touches.length !== 1 || isOnPlayerControls(event.target, touch)) {
      this.swipeStart = undefined;
      return;
    }
    this.swipeStart = { x: touch.clientX, y: touch.clientY };
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

  /**
   * Starts each piece's player once, after hydration, unless reduced motion is asked for. A player
   * that leaves the page is stopped and emptied: a detached video keeps playing its sound.
   */
  private playVideos(): void {
    const motion = inject(MotionPreferenceService);
    let current: HTMLVideoElement | undefined;
    let currentId: string | undefined;
    afterRenderEffect({
      write: () => {
        // Only paused: emptying it could clear a source already bound for the next piece.
        if (this.isStagePending()) {
          untracked(this.player)?.nativeElement.pause();
        }
      },
    });
    afterRenderEffect({
      write: () => {
        const video = this.player()?.nativeElement;
        const id = this.answeredId();
        if (video === current && id === currentId) return;
        if (video !== current) stopVideo(current);
        // The muted binding never changes, so it won't undo a visitor's unmuting.
        else if (video) video.muted = true;
        current = video;
        currentId = id;
        if (video && !untracked(motion.isMotionReduced)) {
          // Autoplay policies may refuse; the player then waits for a press.
          video.play()?.catch(() => undefined);
        }
      },
    });
    inject(DestroyRef).onDestroy(() => stopVideo(current));
  }

  private arrowLink(
    neighbour: NeighbourLink | undefined,
  ): string[] | undefined {
    const id = this.isMoving() ? this.id() : neighbour?.id;
    return id ? ['/i', id] : undefined;
  }

  /** Moving between pieces replaces the history entry, so going back returns to the gallery. */
  private go(id: string | undefined): void {
    if (id && !this.isMoving()) {
      void this.router.navigate(['/i', id], { replaceUrl: true });
    }
  }

  private showToast(text: string): void {
    this.toast.set(text);
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toast.set(''), 2200);
  }

  private async copy(text: string): Promise<boolean> {
    const clipboard = this.document.defaultView?.navigator.clipboard;
    if (!clipboard) return false;
    try {
      await clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }
}

/** Decided when a wait starts: with a piece to hold, the skeleton shows only if the wait lasts. */
function isDelayedWait(
  isWaiting: Signal<boolean>,
  piece: Signal<unknown>,
): Signal<boolean> {
  return linkedSignal({
    source: isWaiting,
    computation: (waiting) => waiting && !!untracked(piece),
  });
}

/** Dragging along a player's position bar is seeking, not a swipe. */
function isOnPlayerControls(target: EventTarget | null, touch: Touch): boolean {
  const video = (target as Element | null)?.closest?.('video');
  if (!video) return false;
  return (
    touch.clientY >
    video.getBoundingClientRect().bottom - PLAYER_CONTROLS_HEIGHT
  );
}

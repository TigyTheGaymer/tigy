import {
  afterNextRender,
  afterRenderEffect,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { MotionPreferenceService } from '../../shared/motion-preference.service';
import { PreviewObserverService } from './preview-observer.service';

/**
 * Plays a video's preview over its tile's still while the tile is on screen.
 * Only in the browser: the server's tile is the still alone, which stays
 * underneath, so a blocked play() leaves the still showing.
 */
@Component({
  selector: 'app-video-preview',
  host: { 'aria-hidden': 'true' },
  template: `
    @if (isActive()) {
      <!-- A property: on a video made by script, the attribute sets only defaultMuted. -->
      <video
        #video
        [muted]="true"
        loop
        playsinline
        preload="none"
        [attr.src]="hasLoaded() ? src() : null"
        [class.is-playing]="isPlaying()"
        (playing)="isPlaying.set(true)"
      ></video>
    }
  `,
  styles: `
    :host {
      position: absolute;
      inset: 0;
      pointer-events: none;
    }

    video {
      width: 100%;
      height: 100%;
      object-fit: contain;
      opacity: 0;
      transition: opacity 300ms;
    }

    video.is-playing {
      opacity: 1;
    }
  `,
})
export class VideoPreview {
  readonly src = input.required<string>();

  private readonly motion = inject(MotionPreferenceService);
  private readonly isBrowser = signal(false);
  protected readonly isActive = computed(
    () =>
      this.isBrowser() &&
      !this.motion.isMotionReduced() &&
      !this.motion.isDataSaved(),
  );
  /** Stays true once the tile has come near, so scrolling back doesn't reload it. */
  protected readonly hasLoaded = signal(false);
  protected readonly isPlaying = signal(false);
  private readonly isVisible = signal(false);
  private readonly video = viewChild<ElementRef<HTMLVideoElement>>('video');

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const observer = inject(PreviewObserverService);
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      this.isBrowser.set(true);
      destroyRef.onDestroy(
        observer.watch(host, {
          near: (isNear) => {
            if (isNear) this.hasLoaded.set(true);
          },
          visible: (isVisible) => this.isVisible.set(isVisible),
        }),
      );
    });

    afterRenderEffect(() => {
      const video = this.video()?.nativeElement;
      if (!video || !this.hasLoaded()) return;
      if (this.isVisible()) {
        // Autoplay policies and Low Power Mode may refuse; the still stays.
        video.play()?.catch(() => undefined);
      } else {
        video.pause();
      }
    });
  }
}

import { DestroyRef, DOCUMENT, inject, Service } from '@angular/core';

export interface PreviewWatcher {
  /** Within half a screen: time to load the preview. */
  near(isNear: boolean): void;
  /** On screen: time to play it. */
  visible(isVisible: boolean): void;
}

/** Two observers for the whole grid rather than two per tile. */
@Service()
export class PreviewObserverService {
  private readonly view = inject(DOCUMENT).defaultView;
  private readonly watchers = new Map<Element, PreviewWatcher>();
  private nearObserver?: IntersectionObserver;
  private visibleObserver?: IntersectionObserver;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.nearObserver?.disconnect();
      this.visibleObserver?.disconnect();
    });
  }

  /** Returns the function that stops watching. */
  watch(element: Element, watcher: PreviewWatcher): () => void {
    const Observer = this.view?.IntersectionObserver;
    if (!Observer) return () => undefined;
    this.nearObserver ??= new Observer(
      (entries) => this.report(entries, 'near'),
      { rootMargin: '50% 0px' },
    );
    this.visibleObserver ??= new Observer((entries) =>
      this.report(entries, 'visible'),
    );
    this.watchers.set(element, watcher);
    this.nearObserver.observe(element);
    this.visibleObserver.observe(element);
    return () => {
      this.watchers.delete(element);
      this.nearObserver?.unobserve(element);
      this.visibleObserver?.unobserve(element);
    };
  }

  private report(
    entries: IntersectionObserverEntry[],
    kind: keyof PreviewWatcher,
  ): void {
    for (const entry of entries) {
      this.watchers.get(entry.target)?.[kind](entry.isIntersecting);
    }
  }
}

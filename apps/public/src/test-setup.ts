// jsdom has no IntersectionObserver; this one never reports. Specs that need reports stub their own.
class SilentIntersectionObserver {
  readonly observe = (): void => undefined;
  readonly unobserve = (): void => undefined;
  readonly disconnect = (): void => undefined;
  readonly takeRecords = (): IntersectionObserverEntry[] => [];
}

globalThis.IntersectionObserver ??=
  SilentIntersectionObserver as unknown as typeof IntersectionObserver;

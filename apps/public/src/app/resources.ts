import { linkedSignal, type Resource, type Signal } from '@angular/core';

/** Keeps the last value while the resource reloads or fails; `keep` drops one that no longer applies. */
export function latest<T>(
  resource: Resource<T | undefined>,
  keep: (previous: T) => boolean = () => true,
): Signal<T | undefined> {
  return linkedSignal<T | undefined, T | undefined>({
    source: () => (resource.hasValue() ? resource.value() : undefined),
    computation: (value, previous) =>
      value ??
      (previous?.value !== undefined && keep(previous.value)
        ? previous.value
        : undefined),
  });
}

export interface Neighbours {
  previous?: string;
  next?: string;
}

/**
 * The artworks before and after `id` in `list`. When `id` has left the list,
 * such as a piece just published while on Unpublished, the neighbours are
 * taken from where it sat in `before`, the list as it was.
 */
export function neighboursOf(
  id: string,
  list: readonly { id: string }[],
  before: readonly { id: string }[] = [],
): Neighbours {
  const index = list.findIndex((item) => item.id === id);
  if (index >= 0) {
    return { previous: list[index - 1]?.id, next: list[index + 1]?.id };
  }
  const was = before.findIndex((item) => item.id === id);
  if (was < 0) return {};
  const ids = new Set(list.map((item) => item.id));
  const previous = before
    .slice(0, was)
    .reverse()
    .find((item) => ids.has(item.id))?.id;
  const next = before.slice(was + 1).find((item) => ids.has(item.id))?.id;
  return { previous, next };
}

/** Firestore reserves field names shaped `__name__`, so such a tag could not be a key of `meta/tags`. */
const RESERVED = /^__.*__$/;

/**
 * Trims, collapses inner whitespace to one space and lowercases a tag. Accented letters are composed (NFC),
 * so "café" typed on different devices is one tag. Returns an empty string for a tag Firestore could not
 * store as a key.
 */
export function normaliseTag(tag: string): string {
  const normalised = tag
    .normalize('NFC')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
  return RESERVED.test(normalised) ? '' : normalised;
}

/** Normalises every tag, dropping empty ones and duplicates while keeping the first occurrence's order. */
export function normaliseTags(tags: readonly string[]): string[] {
  const result: string[] = [];
  for (const tag of tags) {
    const normalised = normaliseTag(tag);
    if (normalised && !result.includes(normalised)) result.push(normalised);
  }
  return result;
}

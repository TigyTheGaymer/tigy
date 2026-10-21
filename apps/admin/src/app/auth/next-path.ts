export const HOME = '/uploads';

/** Only a path inside the admin, never another site. */
export function nextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return HOME;
  if (
    next.includes('\\') ||
    next.includes(':') ||
    next.startsWith('/sign-in')
  ) {
    return HOME;
  }
  return next;
}

export function artworkPath(id: string): string {
  return `/i/${encodeURIComponent(id)}`;
}

// The server streams these from Storage (see server/files.ts).

export function thumbnailUrl(id: string): string {
  return `/img/${encodeURIComponent(id)}/thumb.webp`;
}

export function fullImageUrl(id: string): string {
  return `/img/${encodeURIComponent(id)}/full.webp`;
}

export function videoUrl(id: string): string {
  return `/img/${encodeURIComponent(id)}/full.mp4`;
}

export function previewUrl(id: string): string {
  return `/img/${encodeURIComponent(id)}/preview.mp4`;
}

/** `file.original` is the Storage path, such as `images/k3x/original.png`. */
export function originalUrl({
  id,
  file,
}: {
  id: string;
  file: { original: string };
}): string {
  const name = file.original.slice(file.original.lastIndexOf('/') + 1);
  return `/img/${encodeURIComponent(id)}/${name}`;
}

export function avatarUrl(personId: string): string {
  return `/avatars/${encodeURIComponent(personId)}.webp`;
}

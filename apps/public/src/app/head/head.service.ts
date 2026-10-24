import { DOCUMENT, inject, Service } from '@angular/core';
import { Meta, type MetaDefinition } from '@angular/platform-browser';
import { isVideoFile, TIGY_ID } from '@tigy/models';
import type { ArtworkResponse } from '../../api/types';
import { pieceTitle } from '../shared/format';
import {
  artworkPath,
  avatarUrl,
  fullImageUrl,
  originalUrl,
  videoUrl,
} from '../shared/urls';

/** Each page replaces all of these. */
const MANAGED = [
  'name="description"',
  'property="og:title"',
  'property="og:description"',
  'property="og:image"',
  'property="og:url"',
  'property="og:type"',
  'property="og:video"',
  'property="og:video:secure_url"',
  'property="og:video:type"',
  'property="og:video:width"',
  'property="og:video:height"',
  'name="twitter:card"',
  'name="robots"',
];

/** Link-preview and crawler tags. The `<title>` stays "Tigy" on every page. */
@Service()
export class HeadService {
  private readonly meta = inject(Meta);
  private readonly origin = inject(DOCUMENT).location.origin;

  /** For the home page, not-found pages and safe links. */
  siteCard(options: { isHiddenFromSearch?: boolean } = {}): void {
    this.apply([
      { name: 'description', content: 'Tigy' },
      { property: 'og:title', content: 'Tigy' },
      { property: 'og:description', content: 'Tigy' },
      { property: 'og:image', content: this.url(avatarUrl(TIGY_ID)) },
      { name: 'twitter:card', content: 'summary' },
      ...robots(options.isHiddenFromSearch),
    ]);
  }

  artwork({ artwork }: ArtworkResponse): void {
    const description: MetaDefinition[] = artwork.description
      ? [
          { name: 'description', content: artwork.description },
          { property: 'og:description', content: artwork.description },
        ]
      : [];
    this.apply([
      { property: 'og:title', content: pieceTitle(artwork.title) },
      ...description,
      { property: 'og:image', content: this.url(previewImage(artwork)) },
      { property: 'og:url', content: this.url(artworkPath(artwork.id)) },
      ...this.video(artwork),
      { name: 'twitter:card', content: 'summary_large_image' },
      ...robots(artwork.nsfw),
    ]);
  }

  private video(artwork: ArtworkResponse['artwork']): MetaDefinition[] {
    if (!isVideoFile(artwork.file)) return [];
    const url = this.url(videoUrl(artwork.id));
    return [
      { property: 'og:type', content: 'video.other' },
      { property: 'og:video', content: url },
      { property: 'og:video:secure_url', content: url },
      { property: 'og:video:type', content: 'video/mp4' },
      { property: 'og:video:width', content: String(artwork.file.w) },
      { property: 'og:video:height', content: String(artwork.file.h) },
    ];
  }

  url(path: string): string {
    return this.origin + path;
  }

  private apply(tags: MetaDefinition[]): void {
    for (const selector of MANAGED) this.meta.removeTag(selector);
    this.meta.addTags(tags);
  }
}

/** Embedders animate a GIF but show only the first frame of an animated WebP. */
function previewImage(artwork: ArtworkResponse['artwork']): string {
  return artwork.file.mime === 'image/gif'
    ? originalUrl(artwork)
    : fullImageUrl(artwork.id);
}

function robots(isHiddenFromSearch = false): MetaDefinition[] {
  return isHiddenFromSearch ? [{ name: 'robots', content: 'noindex' }] : [];
}

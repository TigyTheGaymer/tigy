import { DOCUMENT, inject, Service } from '@angular/core';
import { Meta, type MetaDefinition } from '@angular/platform-browser';
import { TIGY_ID } from '@tigy/models';
import type { ArtworkResponse } from '../../api/types';
import { artworkPath, avatarUrl, fullImageUrl } from '../urls';

/** Each page replaces all of these. */
const MANAGED = [
  'name="description"',
  'property="og:title"',
  'property="og:description"',
  'property="og:image"',
  'property="og:url"',
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
      { property: 'og:title', content: artwork.title ?? 'Untitled' },
      ...description,
      { property: 'og:image', content: this.url(fullImageUrl(artwork.id)) },
      { property: 'og:url', content: this.url(artworkPath(artwork.id)) },
      { name: 'twitter:card', content: 'summary_large_image' },
      ...robots(artwork.nsfw),
    ]);
  }

  url(path: string): string {
    return this.origin + path;
  }

  private apply(tags: MetaDefinition[]): void {
    for (const selector of MANAGED) this.meta.removeTag(selector);
    this.meta.addTags(tags);
  }
}

function robots(isHiddenFromSearch = false): MetaDefinition[] {
  return isHiddenFromSearch ? [{ name: 'robots', content: 'noindex' }] : [];
}

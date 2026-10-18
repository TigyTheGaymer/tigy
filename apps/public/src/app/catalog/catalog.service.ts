import {
  HttpErrorResponse,
  httpResource,
  type HttpResourceRef,
} from '@angular/common/http';
import { Service } from '@angular/core';
import {
  formatCursor,
  galleryQueryToParams,
  type GalleryCursor,
  type GalleryQuery,
} from '@tigy/gallery';
import type {
  ArtworkResponse,
  GalleryResponse,
  HomeResponse,
  PeopleResponse,
} from '../../api/types';

export interface GalleryRequest {
  query: GalleryQuery;
  includeNsfw: boolean;
  after?: GalleryCursor;
}

export interface ArtworkRequest {
  id: string;
  includeNsfw: boolean;
}

/** The data endpoints as resources. A request function returning undefined keeps its resource idle. */
@Service()
export class CatalogService {
  gallery(
    request: () => GalleryRequest | undefined,
  ): HttpResourceRef<GalleryResponse | undefined> {
    return httpResource<GalleryResponse>(() => {
      const page = request();
      return (
        page && {
          url: '/api/gallery',
          params: {
            ...galleryQueryToParams(page.query),
            ...nsfwParam(page.includeNsfw),
            ...(page.after && { after: formatCursor(page.after) }),
          },
        }
      );
    });
  }

  people(
    includeNsfw: () => boolean | undefined,
  ): HttpResourceRef<PeopleResponse | undefined> {
    return httpResource<PeopleResponse>(() => {
      const include = includeNsfw();
      return include === undefined
        ? undefined
        : { url: '/api/people', params: nsfwParam(include) };
    });
  }

  artwork(
    request: () => ArtworkRequest | undefined,
  ): HttpResourceRef<ArtworkResponse | undefined> {
    return httpResource<ArtworkResponse>(() => {
      const artwork = request();
      return (
        artwork && {
          url: `/api/artworks/${encodeURIComponent(artwork.id)}`,
          params: nsfwParam(artwork.includeNsfw),
        }
      );
    });
  }

  home(includeNsfw: () => boolean): HttpResourceRef<HomeResponse | undefined> {
    return httpResource<HomeResponse>(() => ({
      url: '/api/home',
      params: nsfwParam(includeNsfw()),
    }));
  }
}

export function isNotFound(error: unknown): boolean {
  return error instanceof HttpErrorResponse && error.status === 404;
}

function nsfwParam(includeNsfw: boolean): Record<string, string> {
  return includeNsfw ? { nsfw: '1' } : {};
}

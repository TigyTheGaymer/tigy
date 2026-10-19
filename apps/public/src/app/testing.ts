import type {
  TestRequest,
  HttpTestingController,
} from '@angular/common/http/testing';
import type { GalleryOverview } from '@tigy/gallery';
import type { GalleryRow } from '@tigy/models';
import type {
  ArtworkResponse,
  GalleryResponse,
  HomeResponse,
} from '../api/types';

// For the app's unit tests only.

/** The request is consumed: later `match` or `expectOne` calls won't find it. */
export async function requested(
  http: HttpTestingController,
  path: string,
): Promise<TestRequest> {
  for (let attempt = 0; attempt < 100; attempt++) {
    const [request] = http.match((req) => req.urlWithParams === path);
    if (request) return request;
    await new Promise((resolve) => setTimeout(resolve));
  }
  const open = http.match(() => true).map((req) => req.request.urlWithParams);
  throw new Error(`No request for ${path}; open requests: ${open.join(', ')}`);
}

export async function settled(): Promise<void> {
  for (let i = 0; i < 5; i++)
    await new Promise((resolve) => setTimeout(resolve));
}

export function row(id: string, fields: Partial<GalleryRow> = {}): GalleryRow {
  return {
    id,
    sortDate: '2025-01-01',
    w: 400,
    h: 300,
    nsfw: false,
    artistIds: [],
    characterIds: [],
    tags: [],
    ...fields,
  };
}

/** One a day back from 2026-01-30; `p01` is newest. */
export function rows(count: number, from = 1): GalleryRow[] {
  return Array.from({ length: count }, (_, i) =>
    row(`p${String(from + i).padStart(2, '0')}`, {
      title: `Piece ${from + i}`,
      sortDate: new Date(Date.UTC(2026, 0, 31 - from - i))
        .toISOString()
        .slice(0, 10),
    }),
  );
}

export function overview(count: number): GalleryOverview {
  return { count, years: [], tags: [], characters: [], artists: [] };
}

export function galleryPage(
  pageRows: GalleryRow[],
  hasMore: boolean,
  total = pageRows.length,
): GalleryResponse {
  return { rows: pageRows, hasMore, overview: overview(total), years: [] };
}

export const HOME: HomeResponse = {
  owner: {
    name: 'Tigy',
    avatar: 'people/tigy/avatar.webp',
    links: [
      {
        network: 'bluesky',
        handle: 'tigy',
        url: 'https://bsky.app/profile/tigy',
      },
    ],
  },
  count: 30,
  oldest: '2025-11-20',
  newest: '2026-04-08',
  years: [],
};

export function artwork(
  fields: Partial<ArtworkResponse['artwork']> = {},
  rest: Partial<Omit<ArtworkResponse, 'artwork'>> = {},
): ArtworkResponse {
  return {
    artwork: {
      id: 'hey-pookie',
      sortDate: '2026-02-14',
      nsfw: false,
      tags: [],
      file: {
        original: 'images/hey-pookie/original.png',
        w: 1620,
        h: 2117,
        bytes: 3_685_241,
        mime: 'image/png',
        animated: false,
        transparent: false,
      },
      ...fields,
    },
    artists: [],
    characters: [],
    ...rest,
  };
}

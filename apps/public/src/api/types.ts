import type { GalleryOverview } from '@tigy/gallery';
import type { GalleryRow, ImageFile, SocialLink } from '@tigy/models';

// The JSON the data endpoints return, shared by the Express server and the Angular services.

/** `GET /api/gallery`: one page of the filtered, sorted gallery. */
export interface GalleryResponse {
  rows: GalleryRow[];
  hasMore: boolean;
  /** For every piece the visitor may see, not only this page. */
  overview: GalleryOverview;
  /** How many matching pieces each year has, newest first: the tail timeline's marks. */
  years: GalleryOverview['years'];
}

/** A person offered in a filter picker, with how many visible pieces credit them. */
export interface PickerPerson {
  id: string;
  name: string;
  avatar?: string;
  count: number;
}

/** `GET /api/people`: the people who appear in pieces the visitor may see. */
export interface PeopleResponse {
  characters: PickerPerson[];
  artists: PickerPerson[];
}

/** A person credited on an artwork. Tigy is `own` and shows no links. */
export interface CreditedPerson {
  id: string;
  name: string;
  avatar?: string;
  links: SocialLink[];
  own?: true;
}

export interface NeighbourLink {
  id: string;
  title?: string;
}

/** `GET /api/artworks/:id`: one published artwork with its credits in order. */
export interface ArtworkResponse {
  artwork: {
    id: string;
    title?: string;
    description?: string;
    date?: string;
    sortDate: string;
    nsfw: boolean;
    tags: string[];
    file: ImageFile;
  };
  artists: CreditedPerson[];
  characters: CreditedPerson[];
  previous?: NeighbourLink;
  next?: NeighbourLink;
}

/** `GET /api/home`: the home header. */
export interface HomeResponse {
  owner: { name: string; avatar?: string; links: SocialLink[] } | null;
  count: number;
  oldest?: string;
  newest?: string;
  years: GalleryOverview['years'];
}

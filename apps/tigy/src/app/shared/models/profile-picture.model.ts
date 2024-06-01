import { Image } from '@tigy/shared';
import { Artist } from './artist.model';

export interface ProfilePicture {
  image: Image
  artist: Artist
}

export const PROFILE_PICTURE_COLLECTION = 'ProfilePictures'

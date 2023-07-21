import {Image} from './image.model';
import {Artist} from './artist.model';

export interface ProfilePicture {
  image: Image
  artist: Artist
}

export const PROFILE_PICTURE_COLLECTION = 'ProfilePictures'

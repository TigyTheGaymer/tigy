import { Image } from './image.model';
import { FieldValue, Timestamp } from 'firebase/firestore';

export interface ProfilePicture {
  uid: string
  image: Image,
  imageBig?: Image,
  imageSmall?: Image,
  artistUid: string,
  createTimestamp: Timestamp | FieldValue
}

export const PROFILE_PICTURE_COLLECTION = 'ProfilePictures'

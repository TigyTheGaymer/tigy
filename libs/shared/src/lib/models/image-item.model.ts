import { Image } from './image.model';
import firebase from 'firebase/compat';
import Timestamp = firebase.firestore.Timestamp;
import FieldValue = firebase.firestore.FieldValue;

export interface ImageItem {
  uid: string
  image: Image,
  imageBig?: Image,
  imageSmall?: Image,
  artistUid: string,
  createTimestamp: Timestamp | FieldValue
}

export const IMAGE_ITEM_COLLECTION = 'ImageItems'

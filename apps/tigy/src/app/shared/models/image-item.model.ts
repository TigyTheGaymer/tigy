import { Image } from './image.model';

export interface ImageItem {
  uid?: string
  image: Image
  artistUid: string
}

export const IMAGE_ITEM_COLLECTION = 'ImageItems'

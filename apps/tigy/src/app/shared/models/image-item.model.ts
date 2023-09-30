import {Image} from './image.model';

export interface ImageItem {
  image: Image
  artistUid: string
}

export const IMAGE_ITEM_COLLECTION = 'ImageItems'

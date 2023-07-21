import {Social} from './social.model';

export interface Artist {
  name: string
  socials: Social[]
}

export const ARTIST_COLLECTION = 'Artists'

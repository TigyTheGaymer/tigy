import { Social } from './social.model';

export interface Artist {
  uid: string;
  name: string;
  socials: Social[];
}

export const ARTIST_COLLECTION = 'Artists';

export interface Social {
  type: SocialType
  name: string
  url: string
}

export enum SocialType {
  TWITTER = 'TWITTER',
  OTHER = 'OTHER',
}

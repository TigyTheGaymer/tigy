export const CDN_CACHE_CONTROL = 'public, max-age=0, s-maxage=300';

/** 10 minutes at the CDN, so a deleted piece's files stop loading in time. */
export const FILE_CACHE_CONTROL = 'public, max-age=86400, s-maxage=600';

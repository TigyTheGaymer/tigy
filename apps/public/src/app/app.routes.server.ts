import { RenderMode, ServerRoute } from '@angular/ssr';
import { CDN_CACHE_CONTROL } from '../server/cache-control';

export const serverRoutes: ServerRoute[] = [
  {
    path: '**',
    renderMode: RenderMode.Server,
    headers: { 'Cache-Control': CDN_CACHE_CONTROL },
  },
];

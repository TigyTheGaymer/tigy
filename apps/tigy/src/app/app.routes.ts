import { Route } from '@angular/router';

export const appRoutes: Route[] = [
  {
    path: 'admin',
    loadComponent: () => import('./features/admin/admin.component').then(mod => mod.AdminComponent)
  },
  {
    path: 'admin/login',
    loadComponent: () => import('./features/admin-login/admin-login.component').then(mod => mod.AdminLoginComponent)
  },
];

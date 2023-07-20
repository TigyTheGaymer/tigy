import { Route } from '@angular/router';
import {HomeComponent} from './features/home/home.component';

export const appRoutes: Route[] = [
  {
    path: '',
    component: HomeComponent
  },
  {
    path: 'admin',
    loadComponent: () => import('./features/admin/admin.component').then(mod => mod.AdminComponent)
  },
  {
    path: 'admin/login',
    loadComponent: () => import('./features/admin-login/admin-login.component').then(mod => mod.AdminLoginComponent)
  },
  {
    path: '**',
    redirectTo: '/'
  }
];

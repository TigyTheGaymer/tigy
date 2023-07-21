import { Route } from '@angular/router';
import {HomeComponent} from './features/home/home.component';
import {adminGuard} from './guards/admin.guard';
import {loginGuard} from './guards/login.guard';

export const appRoutes: Route[] = [
  {
    path: '',
    component: HomeComponent
  },
  {
    path: 'admin',
    loadComponent: () => import('./features/admin/admin.component').then(mod => mod.AdminComponent),
    canActivate: [adminGuard]
  },
  {
    path: 'admin/login',
    loadComponent: () => import('./features/admin-login/admin-login.component').then(mod => mod.AdminLoginComponent),
    canActivate: [loginGuard]
  },
  {
    path: '**',
    redirectTo: '/'
  }
];

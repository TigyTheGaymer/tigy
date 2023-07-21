import {CanActivateFn, Router} from '@angular/router';
import {inject} from '@angular/core';
import {AdminService} from '../services/admin.service';
import {map, take} from 'rxjs';

export const loginGuard: CanActivateFn = () => {
  const adminService = inject(AdminService)
  const router = inject(Router)
  return adminService.user$.pipe(
    take(1),
    map(user => {
      return user ? router.parseUrl('/admin') : true
    })
  );
};

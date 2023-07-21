import {CanActivateFn, Router} from '@angular/router';
import {inject} from '@angular/core';
import {AdminService} from '../services/admin.service';
import {map, take} from 'rxjs';

export const adminGuard: CanActivateFn = () => {
  const adminService = inject(AdminService)
  const router = inject(Router)
  return adminService.user$.pipe(
    take(1),
    map(user => user ? true : router.parseUrl('/admin/login'))
  );
};

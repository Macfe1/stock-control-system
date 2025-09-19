import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const roleGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const allowed: Array<'public'|'operator'|'admin'> = route.data?.['roles'] ?? [];
  const userRole = auth.role();

  if (!auth.isLoggedIn()) {
    router.navigate(['/login']);
    return false;
  }
  if (allowed.length && (!userRole || !allowed.includes(userRole))) {
    // redirige a dashboard si no tiene permiso
    router.navigate(['/app/dashboard']);
    return false;
  }
  return true;
};

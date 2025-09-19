import { Routes } from '@angular/router';
import { authGuard } from './services/auth.guard';
import { roleGuard } from './services/role.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/login.page').then(m => m.LoginPage)
  },

  {
    path: 'app',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/shell/shell.layout').then(m => m.ShellLayout),
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/dashboard/dashboard.page').then(m => m.DashboardPage)
      },

      // Público/Operador/Admin (el backend ya filtra lo que ve cada uno)
      {
        path: 'bodegas-productos',
        loadComponent: () =>
          import('./pages/bodegas-productos/bodegas-productos.page')
            .then(m => m.BodegasProductosPage)
      },

      // Solo operador o admin
      {
        path: 'movimientos',
        canActivate: [roleGuard],
        data: { roles: ['operator', 'admin'] },
        loadComponent: () =>
          import('./pages/movimientos/movimientos.page')
            .then(m => m.MovimientosPage)
      },
      {
        path: 'nuevo-ingreso',
        canActivate: [roleGuard],
        data: { roles: ['operator', 'admin'] },
        loadComponent: () =>
          import('./pages/nuevo-ingreso/nuevo-ingreso.page')
            .then(m => m.NuevoIngresoPage)
      },

      // Solo admin
      {
        path: 'usuarios',
        canActivate: [roleGuard],
        data: { roles: ['admin'] },
        loadComponent: () =>
          import('./pages/usuarios/usuarios.page').then(m => m.UsuariosPage)
      },

      { path: '', pathMatch: 'full', redirectTo: 'dashboard' }
    ]
  },

  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: '**', redirectTo: 'login' }
];


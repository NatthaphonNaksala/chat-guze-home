import { Routes } from '@angular/router';

export default [
  {
    path: '',
    loadComponent: () => import('./home').then(m => m.Home),
  }
] as Routes;
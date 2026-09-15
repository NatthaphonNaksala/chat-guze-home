import { Routes } from '@angular/router';

export default [
  {
    path: '',
    loadComponent: () => import('./chat').then(m => m.Chat),
  }
] as Routes;
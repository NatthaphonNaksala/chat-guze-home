import { Routes } from '@angular/router';
import { Home } from './pages/home/home';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full'
  },
  {
    path: 'home',
    loadChildren: () => import('./pages/home/home.routes') 
  },
  {
    path: 'chat',
    loadChildren: () => import('./pages/chat/chat.routes') 
  },
  {
    path: '**',
    redirectTo: 'home'
  }
];

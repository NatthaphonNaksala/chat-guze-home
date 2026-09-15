import { Component, signal } from '@angular/core';
import { MENU_DATA, MenuItemsType } from './sidebar.model';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-sidebar',
  imports: [
    RouterLink,
    CommonModule,
  ],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class Sidebar {

  public menuData: MenuItemsType[] = MENU_DATA;

  public openSubmenu = signal<string | null>(null);

  // Mock User Data
  public user = signal({
    name: 'Jese Leose',
    gp: 3000,
    lotsPerDay: 10,
    balance: 87254.34,
    avatar: 'https://flowbite.com/docs/images/people/profile-picture-5.jpg'
  });

  toggleSubmenu(label?: string) {
    if (!label) return;
    this.openSubmenu.update((current) => (current === label ? null : label));
  }

  isSubmenuOpen(label?: string): boolean {
    return this.openSubmenu() === label;
  }

}

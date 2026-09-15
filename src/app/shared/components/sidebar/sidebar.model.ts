export interface SubItemsType {
  icon: string;
  label: string;
  link: string;
  badge?: string | number;
}

export interface MenuItemsType {
  icon?: string;
  label?: string;
  type: 'link' | 'submenu' | 'section';
  link?: string;
  badge?: string | number;
  subItems?: SubItemsType[];
}

export const MENU_DATA: MenuItemsType[] = [
  // General Section
  { type: 'section', label: 'General' },
  { icon: 'grid', label: 'Home', type: 'link', link: '/home' },
  { icon: 'wallet', label: 'Chat', type: 'link', link: '/chat' },

  // Feature Section
  { type: 'section', label: 'Feature' },
  { icon: 'trophy', label: 'Pip Battle', type: 'link', link: '/pip-battle' },
  {
    icon: 'users',
    label: 'Social Trade',
    type: 'submenu',
    subItems: [
      { icon: 'bar-chart', label: 'Leaderboard', link: '/social-trade/leaderboard' },
      { icon: 'briefcase', label: 'My Investment', link: '/social-trade/my-investment' },
      { icon: 'file-text', label: 'Terms & Conditions', link: '/social-trade/terms' },
    ],
  },
];
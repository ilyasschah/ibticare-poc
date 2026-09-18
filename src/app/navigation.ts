/** The application's destinations. Shared by the routes, the side drawer and the assistant. */
export interface NavLink {
  /** Router path, e.g. `/dashboard`. */
  path: string;
  label: string;
  /** Tag name the assistant uses, e.g. `[NAV:DASHBOARD]`. */
  tag: string;
  /** Agent context domain this destination displays. */
  domain: string;
}

export const NAV_LINKS: readonly NavLink[] = [
  { path: '/dashboard', label: 'Dashboard', tag: 'DASHBOARD', domain: 'dashboard' },
  { path: '/profile', label: 'Profile', tag: 'PROFILE', domain: 'profile' },
  { path: '/settings', label: 'Settings', tag: 'SETTINGS', domain: 'settings' },
];

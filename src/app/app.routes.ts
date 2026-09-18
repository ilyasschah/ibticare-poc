import { Routes } from '@angular/router';
import { AGENT_DOMAIN } from './agent/agent-context.service';
import { NAV_LINKS } from './navigation';

/** One route per destination; `agentDomain` tells the assistant which data slice a page shows. */
export const routes: Routes = [
  { path: '', redirectTo: NAV_LINKS[0].path.slice(1), pathMatch: 'full' },
  {
    path: 'dashboard',
    title: 'Dashboard',
    data: { [AGENT_DOMAIN]: 'dashboard' },
    loadComponent: () => import('./dashboard/dashboard').then((m) => m.Dashboard),
  },
  {
    path: 'profile',
    title: 'Profile',
    data: { [AGENT_DOMAIN]: 'profile' },
    loadComponent: () => import('./profile/profile').then((m) => m.Profile),
  },
  {
    path: 'settings',
    title: 'Settings',
    data: { [AGENT_DOMAIN]: 'settings' },
    loadComponent: () => import('./settings/settings').then((m) => m.Settings),
  },
];

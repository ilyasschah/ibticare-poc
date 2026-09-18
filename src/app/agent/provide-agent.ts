import {
  EnvironmentProviders,
  makeEnvironmentProviders,
  provideAppInitializer,
} from '@angular/core';
import { registerDashboardDomain } from './domains/dashboard.agent';
import { registerNavigationDomain } from './domains/navigation.agent';
import { registerProfileDomain } from './domains/profile.agent';
import { registerSettingsDomain } from './domains/settings.agent';

/**
 * Wires the application's domains into the assistant.
 *
 * Registration happens once at startup rather than when a page is visited, which is what lets the
 * user ask about the dashboard from the settings screen. Adding a new capability means writing one
 * `*.agent.ts` adapter and adding a line here; the prompt and the dispatcher pick it up for free.
 */
export function provideAgent(): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideAppInitializer(() => {
      registerNavigationDomain();
      registerDashboardDomain();
      registerProfileDomain();
      registerSettingsDomain();
    }),
  ]);
}

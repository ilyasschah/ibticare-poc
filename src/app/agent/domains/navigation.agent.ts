import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AgentActionService } from '../agent-action.service';
import { NAV_LINKS } from '../../navigation';

/** Lets the assistant move the user between pages. Driven by the same list as the side drawer. */
export function registerNavigationDomain(): void {
  const actions = inject(AgentActionService);
  const router = inject(Router);

  for (const link of NAV_LINKS) {
    actions.register({
      kind: 'NAV',
      name: link.tag,
      description: `Open the ${link.label} page.`,
      example: `[NAV:${link.tag}]`,
      run: () => {
        void router.navigate([link.path]);
        return { ok: true, message: `Opening ${link.label}.` };
      },
    });
  }
}

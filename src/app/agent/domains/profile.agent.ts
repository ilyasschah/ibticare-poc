import { inject } from '@angular/core';
import { AgentActionService } from '../agent-action.service';
import { AgentContextService } from '../agent-context.service';
import { UserProfileService } from '../../services/user-profile.service';

/** Exposes the signed-in user's account, and lets the assistant edit the safe parts of it. */
export function registerProfileDomain(): void {
  const context = inject(AgentContextService);
  const actions = inject(AgentActionService);
  const profile = inject(UserProfileService);

  context.register({
    id: 'profile',
    description: "The signed-in user's own account: their name, email and role.",
    snapshot: () => ({
      ...profile.profile(),
      editableByAssistant: ['name', 'email'],
      roleIsReadOnly: true,
    }),
    examples: () => {
      const { name, role } = profile.profile();
      return [
        { question: 'what is my user name?', answer: `Your name is ${name}.` },
        { question: 'what is my role?', answer: `You are signed in as a ${role}.` },
      ];
    },
  });

  actions.register({
    kind: 'ACTION',
    name: 'UPDATE_NAME',
    description: "Change the signed-in user's own name.",
    parameter: 'the new full name, unquoted',
    example: '[ACTION:UPDATE_NAME:Sarah Connor]',
    run: (value) => {
      const error = profile.updateName(value ?? '');
      return error
        ? { ok: false, message: `I couldn't update your name: ${error}` }
        : { ok: true, message: `Your name is now ${profile.profile().name}.` };
    },
  });

  actions.register({
    kind: 'ACTION',
    name: 'UPDATE_EMAIL',
    description: "Change the signed-in user's own email address.",
    parameter: 'the new email address, unquoted',
    example: '[ACTION:UPDATE_EMAIL:sarah@example.com]',
    run: (value) => {
      const error = profile.updateEmail(value ?? '');
      return error
        ? { ok: false, message: `I couldn't update your email: ${error}` }
        : { ok: true, message: `Your email is now ${profile.profile().email}.` };
    },
  });
}

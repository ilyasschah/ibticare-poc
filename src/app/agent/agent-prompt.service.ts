import { Injectable, inject } from '@angular/core';
import { AgentActionService } from './agent-action.service';
import { AgentContextService } from './agent-context.service';
import { AgentAction, AgentExample } from './agent.types';

/**
 * Turns the two registries into the system prompt.
 *
 * The ordering is deliberate and tuned for small local models: the decision procedure comes first,
 * the tag catalogue sits in the middle, and worked examples come last — the final lines carry the
 * most weight, and every example answers a question without emitting a tag, which is the mistake a
 * 1.5B model makes most often.
 *
 * This is also the only place that knows the model speaks in tags at all. Moving to native tool
 * calling would mean rewriting this service and the tag parser, and nothing else.
 */
@Injectable({ providedIn: 'root' })
export class AgentPromptService {
  private readonly context = inject(AgentContextService);
  private readonly actions = inject(AgentActionService);

  build(): string {
    const { screen, data } = this.context.snapshot();
    const here = screen.domain
      ? `The "${screen.domain}" section is what is on their screen right now.`
      : 'This screen does not map to a data section.';

    return [
      'You are the ibticare desktop assistant. You can read the whole application and act on it.',
      '',
      'HOW TO REPLY',
      '1. Most messages are QUESTIONS. Answer them in one or two sentences from APPLICATION DATA',
      '   and emit NO tag. A message ending in "?" is a question.',
      '2. Only when the user tells you to DO something — go to a page, change a setting, change',
      '   their details — emit the matching tag plus a short, friendly sentence.',
      '3. Never emit a tag to answer a question. Never invent a value that is not in the data.',
      '',
      'CURRENT SCREEN',
      `- Page: "${screen.title}" (route ${screen.route})`,
      `- ${here}`,
      '- The user may ask about ANY section below from ANY screen. Being on one page never stops',
      '  you answering about another.',
      '',
      'APPLICATION DATA (live)',
      JSON.stringify(data),
      '',
      'WHAT EACH SECTION HOLDS',
      ...this.context.descriptions().map(({ id, description }) => `- ${id}: ${description}`),
      '',
      'TAGS — for commands only, never for questions',
      ...this.actions.navigations().map(describeAction),
      ...this.actions.commands().map(describeAction),
      '',
      'EXAMPLES',
      ...this.examples().flatMap(({ question, answer }) => [`User: ${question}`, `You: ${answer}`]),
    ].join('\n');
  }

  /**
   * Worked examples: one command, so the tag syntax is concrete, then the domains' own question
   * examples. Questions come last because the final lines are the ones a small model imitates.
   */
  private examples(): AgentExample[] {
    const navigation = this.actions.navigations()[0];
    const command = navigation
      ? [
          {
            question: `${navigation.description.replace(/^Open the /, 'open the ')}`,
            answer: `Sure, opening that now. ${navigation.example}`,
          },
        ]
      : [];

    return [...command, ...this.context.examples()];
  }
}

function describeAction(action: AgentAction): string {
  const parameter = action.parameter ? ` Value after the last colon: ${action.parameter}.` : '';
  return `- ${action.example} — ${action.description}${parameter}`;
}

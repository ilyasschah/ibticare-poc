import { Injectable, computed, signal } from '@angular/core';
import { ActionResult, AgentAction, AgentTagKind } from './agent.types';

/**
 * What the assistant can do.
 *
 * Domains register their own actions, so adding a capability is a single registration: the prompt
 * that teaches the model about it is generated from this registry, and the chat widget dispatches
 * back into it by name. Neither has to be edited.
 */
@Injectable({ providedIn: 'root' })
export class AgentActionService {
  private readonly registry = signal<readonly AgentAction[]>([]);

  readonly actions = computed(() => this.registry());
  readonly navigations = computed(() => this.registry().filter((a) => a.kind === 'NAV'));
  readonly commands = computed(() => this.registry().filter((a) => a.kind === 'ACTION'));

  /** Registers an action. Re-registering the same kind and name replaces it. */
  register(action: AgentAction): void {
    this.registry.update((current) => [
      ...current.filter((a) => !(a.kind === action.kind && a.name === action.name)),
      action,
    ]);
  }

  /**
   * Runs a registered action. An omitted `kind` is resolved by name alone, which is how a bare
   * `[PROFILE]` from a small model still works. Returns null when nothing matches.
   */
  execute(kind: AgentTagKind | undefined, name: string, value?: string): ActionResult | null {
    const action = this.registry().find((a) => a.name === name && (!kind || a.kind === kind));
    if (!action) return null;
    try {
      return action.run(value);
    } catch (error: unknown) {
      const reason = error instanceof Error ? error.message : String(error);
      return { ok: false, message: `I couldn't complete that: ${reason}` };
    }
  }
}

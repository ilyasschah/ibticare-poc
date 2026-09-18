import { Injectable, computed, inject, signal } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveEnd, Router } from '@angular/router';
import { AgentData, AgentExample, AgentSnapshot, ContextProvider, ScreenInfo } from './agent.types';

/** Route `data` key naming the domain a route displays. */
export const AGENT_DOMAIN = 'agentDomain';

/**
 * What the assistant can read.
 *
 * Domains register once at startup, not when their page is visited, so every answer is available
 * from every screen — the user can ask about their best customer while sitting on Settings. The
 * current route is tracked separately, purely so the assistant knows where the user is looking.
 */
@Injectable({ providedIn: 'root' })
export class AgentContextService {
  private readonly router = inject(Router);
  private readonly providers = signal<readonly ContextProvider[]>([]);
  private readonly screenSignal = signal<ScreenInfo>({ route: '', title: '' });

  readonly screen = this.screenSignal.asReadonly();
  readonly domainIds = computed(() => this.providers().map((p) => p.id));

  constructor() {
    this.syncScreen(this.router.url, this.router.routerState.snapshot.root);
    this.router.events.subscribe((event) => {
      // ResolveEnd fires before the routed component is created, so the screen is correct even if
      // the user sends a message the instant the page appears.
      if (event instanceof ResolveEnd) this.syncScreen(event.urlAfterRedirects, event.state.root);
    });
  }

  /** Registers a domain. Re-registering the same id replaces it, which keeps hot reloads sane. */
  register(provider: ContextProvider): void {
    this.providers.update((current) => [...current.filter((p) => p.id !== provider.id), provider]);
  }

  /** Everything the assistant knows, read fresh. */
  snapshot(): AgentSnapshot {
    const data: Record<string, AgentData> = {};
    for (const provider of this.providers()) {
      data[provider.id] = provider.snapshot();
    }
    return { screen: this.screenSignal(), data };
  }

  /** Every domain's worked question/answer examples, in registration order. */
  examples(): AgentExample[] {
    return this.providers().flatMap((provider) => [...(provider.examples?.() ?? [])]);
  }

  /** `id` → description, used to tell the model what each section of the snapshot holds. */
  descriptions(): { id: string; description: string }[] {
    return this.providers().map(({ id, description }) => ({ id, description }));
  }

  private syncScreen(url: string, root: ActivatedRouteSnapshot): void {
    let node = root;
    while (node.firstChild) node = node.firstChild;

    const segment = url.split(/[?#]/)[0].split('/').filter(Boolean).pop() ?? '';
    const domain: unknown = node.data[AGENT_DOMAIN];

    this.screenSignal.set({
      route: url,
      title: node.title ?? (segment ? segment[0].toUpperCase() + segment.slice(1) : ''),
      domain: typeof domain === 'string' ? domain : undefined,
    });
  }
}

import { Injectable, computed, inject, signal } from '@angular/core';
import { ActivatedRouteSnapshot, NavigationStart, ResolveEnd, Router } from '@angular/router';

export type ScreenMetricValue =
  | string
  | number
  | boolean
  | ScreenMetricValue[]
  | { [key: string]: ScreenMetricValue };

export type ScreenMetrics = Record<string, ScreenMetricValue>;

export interface ScreenContext {
  pageTitle: string;
  route: string;
  metrics: ScreenMetrics;
}

/**
 * Holds what the user is currently looking at so the assistant can answer questions about it.
 * The route and default title follow the router; pages publish their own metrics.
 */
@Injectable({ providedIn: 'root' })
export class ScreenContextService {
  private readonly router = inject(Router);

  private readonly pageTitle = signal('');
  private readonly route = signal('');
  private readonly metrics = signal<ScreenMetrics>({});

  readonly context = computed<ScreenContext>(() => ({
    pageTitle: this.pageTitle(),
    route: this.route(),
    metrics: this.metrics(),
  }));

  constructor() {
    this.syncFromSnapshot(this.router.url, this.router.routerState.snapshot.root);

    this.router.events.subscribe((event) => {
      if (event instanceof NavigationStart) {
        // Drop the previous page's data before the next page is created.
        this.metrics.set({});
      } else if (event instanceof ResolveEnd) {
        // ResolveEnd fires before the routed component is created, so pages can still override the title.
        this.syncFromSnapshot(event.urlAfterRedirects, event.state.root);
      }
    });
  }

  setPageTitle(title: string): void {
    this.pageTitle.set(title);
  }

  setMetrics(metrics: ScreenMetrics): void {
    this.metrics.set({ ...metrics });
  }

  updateMetrics(partial: ScreenMetrics): void {
    this.metrics.update((current) => ({ ...current, ...partial }));
  }

  clear(): void {
    this.pageTitle.set('');
    this.metrics.set({});
  }

  private syncFromSnapshot(url: string, root: ActivatedRouteSnapshot): void {
    this.route.set(url);
    this.pageTitle.set(this.titleFor(root, url));
  }

  private titleFor(root: ActivatedRouteSnapshot, url: string): string {
    let node = root;
    while (node.firstChild) {
      node = node.firstChild;
    }
    if (node.title) {
      return node.title;
    }
    const segment = url.split(/[?#]/)[0].split('/').filter(Boolean).pop() ?? '';
    return segment ? segment.charAt(0).toUpperCase() + segment.slice(1) : '';
  }
}

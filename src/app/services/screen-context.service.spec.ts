import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { ScreenContextService } from './screen-context.service';

@Component({ template: '' })
class Blank {}

describe('ScreenContextService', () => {
  let service: ScreenContextService;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'dashboard', component: Blank, title: 'Dashboard' },
          { path: 'profile', component: Blank },
        ]),
      ],
    });
    service = TestBed.inject(ScreenContextService);
    router = TestBed.inject(Router);
  });

  it('tracks the route and route title', async () => {
    await router.navigateByUrl('/dashboard');
    expect(service.context()).toEqual({ pageTitle: 'Dashboard', route: '/dashboard', metrics: {} });
  });

  it('derives a title from the path when the route has none', async () => {
    await router.navigateByUrl('/profile');
    expect(service.context().pageTitle).toBe('Profile');
  });

  it('merges metrics and clears them on navigation', async () => {
    await router.navigateByUrl('/dashboard');
    service.setMetrics({ balance: '$54,200' });
    service.updateMetrics({ activeUsers: 120 });
    expect(service.context().metrics).toEqual({ balance: '$54,200', activeUsers: 120 });

    await router.navigateByUrl('/profile');
    expect(service.context().metrics).toEqual({});
  });
});

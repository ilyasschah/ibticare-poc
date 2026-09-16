import { TestBed } from '@angular/core/testing';
import { ActionRegistryService } from './action-registry.service';

describe('ActionRegistryService', () => {
  let service: ActionRegistryService;

  beforeEach(() => {
    try { localStorage.clear(); } catch { /* Node may expose a non-functional localStorage. */ }
    document.body.classList.remove('dark-theme');
    service = TestBed.inject(ActionRegistryService);
  });

  it('toggles .dark-theme on the body through the isDarkMode signal', () => {
    expect(service.execute('DARK_MODE_ON')).toBe(true);
    TestBed.tick();
    expect(service.isDarkMode()).toBe(true);
    expect(document.body.classList.contains('dark-theme')).toBe(true);

    expect(service.execute('DARK_MODE_OFF')).toBe(true);
    TestBed.tick();
    expect(document.body.classList.contains('dark-theme')).toBe(false);
  });

  it('ignores unknown actions', () => {
    expect(service.execute('SELF_DESTRUCT')).toBe(false);
    expect(service.isDarkMode()).toBe(false);
  });
});

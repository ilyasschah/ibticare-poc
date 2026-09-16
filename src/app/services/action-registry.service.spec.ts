import { TestBed } from '@angular/core/testing';
import { ActionRegistryService } from './action-registry.service';
import { UserProfileService } from './user-profile.service';

describe('ActionRegistryService', () => {
  let service: ActionRegistryService;

  beforeEach(() => {
    try { localStorage.clear(); } catch { /* Node may expose a non-functional localStorage. */ }
    document.body.classList.remove('dark-theme');
    service = TestBed.inject(ActionRegistryService);
  });

  it('toggles .dark-theme on the body through the isDarkMode signal', () => {
    expect(service.execute('DARK_MODE_ON')?.ok).toBe(true);
    TestBed.tick();
    expect(service.isDarkMode()).toBe(true);
    expect(document.body.classList.contains('dark-theme')).toBe(true);

    expect(service.execute('DARK_MODE_OFF')?.ok).toBe(true);
    TestBed.tick();
    expect(document.body.classList.contains('dark-theme')).toBe(false);
  });

  it('updates the profile name and email', () => {
    const profile = TestBed.inject(UserProfileService);

    expect(service.execute('UPDATE_NAME', 'Sarah Connor')).toEqual({ ok: true, message: 'Your name is now Sarah Connor.' });
    expect(service.execute('UPDATE_EMAIL', 'sarah@example.com')?.ok).toBe(true);
    expect(profile.profile().name).toBe('Sarah Connor');
    expect(profile.profile().email).toBe('sarah@example.com');
  });

  it('reports invalid profile values without changing the profile', () => {
    const profile = TestBed.inject(UserProfileService);
    const before = profile.profile();

    const result = service.execute('UPDATE_EMAIL', 'nope');
    expect(result?.ok).toBe(false);
    expect(result?.message).toContain("couldn't update your email");
    expect(service.execute('UPDATE_NAME')?.ok).toBe(false);
    expect(profile.profile()).toEqual(before);
  });

  it('returns null for unknown actions', () => {
    expect(service.execute('SELF_DESTRUCT')).toBeNull();
    expect(service.isDarkMode()).toBe(false);
  });
});

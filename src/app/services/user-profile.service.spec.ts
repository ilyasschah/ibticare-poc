import { TestBed } from '@angular/core/testing';
import { UserProfileService } from './user-profile.service';

describe('UserProfileService', () => {
  let service: UserProfileService;

  beforeEach(() => {
    service = TestBed.inject(UserProfileService);
  });

  it('updates the name and trims it', () => {
    expect(service.updateName('  Sarah Connor ')).toBeNull();
    expect(service.profile().name).toBe('Sarah Connor');
  });

  it('rejects an empty or too long name', () => {
    const before = service.profile().name;
    expect(service.updateName('   ')).toContain('empty');
    expect(service.updateName('x'.repeat(81))).toContain('at most');
    expect(service.profile().name).toBe(before);
  });

  it('updates a valid email and rejects an invalid one', () => {
    expect(service.updateEmail('sarah@example.com')).toBeNull();
    expect(service.profile().email).toBe('sarah@example.com');

    expect(service.updateEmail('not-an-email')).toContain('not a valid email');
    expect(service.profile().email).toBe('sarah@example.com');
  });

  it('saves a full profile', () => {
    expect(service.save({ name: 'Kyle Reese', email: 'kyle@example.com', role: 'Viewer' })).toBeNull();
    expect(service.profile()).toEqual({ name: 'Kyle Reese', email: 'kyle@example.com', role: 'Viewer' });
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { Profile } from './profile';
import { UserProfileService } from '../services/user-profile.service';
import { ScreenContextService } from '../services/screen-context.service';
import { ActionRegistryService } from '../services/action-registry.service';

describe('Profile', () => {
  let fixture: ComponentFixture<Profile>;
  let el: HTMLElement;
  let profile: UserProfileService;

  const input = (id: string) => el.querySelector<HTMLInputElement>(`#${id}`)!;

  function type(id: string, value: string): void {
    const field = input(id);
    field.value = value;
    field.dispatchEvent(new Event('input'));
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Profile],
      providers: [provideRouter([])],
    }).compileComponents();

    profile = TestBed.inject(UserProfileService);
    fixture = TestBed.createComponent(Profile);
    el = fixture.nativeElement;
    await fixture.whenStable();
  });

  it('fills the form from the saved profile and publishes it to the screen context', () => {
    expect(input('profile-name').value).toBe(profile.profile().name);
    expect(input('profile-email').value).toBe(profile.profile().email);
    expect(el.querySelector<HTMLSelectElement>('#profile-role')!.value).toBe(profile.profile().role);

    const { pageTitle, metrics } = TestBed.inject(ScreenContextService).context();
    expect(pageTitle).toBe('Profile');
    expect(metrics['userProfile']).toEqual(profile.profile());
  });

  it('saves edits made in the form', async () => {
    type('profile-name', 'Kyle Reese');
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    expect(profile.profile().name).toBe('Kyle Reese');
    expect(el.querySelector('[role="status"]')!.textContent).toContain('Profile saved.');
  });

  it('does not save invalid input', async () => {
    const before = profile.profile();
    type('profile-email', 'broken');
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    expect(profile.profile()).toEqual(before);
    expect(el.querySelector('#profile-email-error')!.textContent).toContain('valid email');
  });

  it('reflects an assistant update without losing unsaved edits to other fields', async () => {
    type('profile-email', 'draft@example.com');

    TestBed.inject(ActionRegistryService).execute('UPDATE_NAME', 'Sarah Connor');
    await fixture.whenStable();

    expect(input('profile-name').value).toBe('Sarah Connor');
    expect(input('profile-email').value).toBe('draft@example.com');
    expect(el.querySelector('[role="status"]')!.textContent).toContain('Name updated by the assistant.');
    expect(TestBed.inject(ScreenContextService).context().metrics['userProfile']).toEqual(
      expect.objectContaining({ name: 'Sarah Connor' }),
    );
  });
});

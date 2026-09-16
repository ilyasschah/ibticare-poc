import { ChangeDetectionStrategy, Component, effect, inject, signal, untracked } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ScreenContextService } from '../services/screen-context.service';
import {
  EMAIL_PATTERN,
  NAME_MAX_LENGTH,
  USER_ROLES,
  UserProfile,
  UserProfileService,
} from '../services/user-profile.service';

type ProfileField = keyof UserProfile;
const FIELD_LABELS: Record<ProfileField, string> = { name: 'Name', email: 'Email', role: 'Role' };

@Component({
  selector: 'app-profile',
  imports: [ReactiveFormsModule],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Profile {
  private readonly userProfile = inject(UserProfileService);
  private readonly screenContext = inject(ScreenContextService);

  protected readonly roles = USER_ROLES;
  protected readonly nameMaxLength = NAME_MAX_LENGTH;
  protected readonly status = signal('');
  /** Fields the assistant changed since the last time the user interacted with the form. */
  protected readonly assistantUpdated = signal<ReadonlySet<ProfileField>>(new Set());

  protected readonly form = inject(NonNullableFormBuilder).group({
    name: ['', [Validators.required, Validators.maxLength(NAME_MAX_LENGTH)]],
    email: ['', [Validators.required, Validators.pattern(EMAIL_PATTERN)]],
    role: this.userProfile.profile().role as UserProfile['role'],
  });

  private synced: UserProfile | null = null;

  constructor() {
    this.screenContext.setPageTitle('Profile');

    effect(() => {
      const profile = this.userProfile.profile();
      untracked(() => this.syncForm(profile));
      this.screenContext.setMetrics({
        userProfile: { ...profile },
        assistantCanUpdate: ['name', 'email'],
      });
    });
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.status.set('Please fix the highlighted fields.');
      return;
    }
    const error = this.userProfile.save(this.form.getRawValue());
    // Mark the saved values as already synced so the effect doesn't attribute this save to the assistant.
    this.synced = this.userProfile.profile();
    this.form.markAsPristine();
    this.assistantUpdated.set(new Set());
    this.status.set(error ?? 'Profile saved.');
  }

  protected discard(): void {
    const saved = this.userProfile.profile();
    this.form.reset(saved);
    this.synced = saved;
    this.assistantUpdated.set(new Set());
    this.status.set('Changes discarded.');
  }

  /**
   * Copies saved values into the form. Only fields whose saved value changed are touched,
   * so an assistant update to one field doesn't wipe the user's unsaved edits to another.
   */
  private syncForm(profile: UserProfile): void {
    const previous = this.synced;
    this.synced = profile;

    if (!previous) {
      this.form.reset(profile);
      return;
    }

    const changed = (Object.keys(FIELD_LABELS) as ProfileField[]).filter((f) => previous[f] !== profile[f]);
    if (!changed.length) return;

    for (const field of changed) {
      const control = this.form.controls[field];
      control.setValue(profile[field] as never);
      control.markAsPristine();
    }
    this.assistantUpdated.update((set) => new Set([...set, ...changed]));
    this.status.set(`${changed.map((f) => FIELD_LABELS[f]).join(' and ')} updated by the assistant.`);
  }
}

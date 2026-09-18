import { Injectable, signal } from '@angular/core';

export const USER_ROLES = ['Administrator', 'Clinician', 'Billing Manager', 'Viewer'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export interface UserProfile {
  name: string;
  email: string;
  role: UserRole;
}

export const NAME_MAX_LENGTH = 80;
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Returns an error message, or null when the name is valid. */
export function validateName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return 'Name cannot be empty.';
  if (trimmed.length > NAME_MAX_LENGTH)
    return `Name must be at most ${NAME_MAX_LENGTH} characters.`;
  return null;
}

/** Returns an error message, or null when the email is valid. */
export function validateEmail(email: string): string | null {
  return EMAIL_PATTERN.test(email.trim()) ? null : `"${email}" is not a valid email address.`;
}

/** The signed-in user's saved profile. Shared by the Profile page and assistant actions. */
@Injectable({ providedIn: 'root' })
export class UserProfileService {
  private readonly state = signal<UserProfile>({
    name: 'Alex Morgan',
    email: 'alex.morgan@ibticare.com',
    role: 'Administrator',
  });

  readonly profile = this.state.asReadonly();

  /** Returns an error message, or null on success. */
  updateName(name: string): string | null {
    const error = validateName(name);
    if (error) return error;
    this.state.update((p) => ({ ...p, name: name.trim() }));
    return null;
  }

  /** Returns an error message, or null on success. */
  updateEmail(email: string): string | null {
    const error = validateEmail(email);
    if (error) return error;
    this.state.update((p) => ({ ...p, email: email.trim() }));
    return null;
  }

  /** Returns an error message, or null on success. */
  save(profile: UserProfile): string | null {
    const error = validateName(profile.name) ?? validateEmail(profile.email);
    if (error) return error;
    if (!USER_ROLES.includes(profile.role)) return `Unknown role "${profile.role}".`;
    this.state.set({ name: profile.name.trim(), email: profile.email.trim(), role: profile.role });
    return null;
  }
}

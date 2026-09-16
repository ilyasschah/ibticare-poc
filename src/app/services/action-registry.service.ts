import { DOCUMENT } from '@angular/common';
import { Injectable, effect, inject, signal } from '@angular/core';
import { UserProfileService } from './user-profile.service';

const DARK_MODE_STORAGE_KEY = 'ibticare.darkMode';

export interface ActionResult {
  ok: boolean;
  /** Confirmation on success, reason on failure. Shown to the user. */
  message: string;
}

/** Actions the assistant can trigger with `[ACTION:<NAME>]` or `[ACTION:<NAME>:<value>]` tags. */
@Injectable({ providedIn: 'root' })
export class ActionRegistryService {
  private readonly document = inject(DOCUMENT);
  private readonly userProfile = inject(UserProfileService);

  readonly isDarkMode = signal<boolean>(readStoredDarkMode());

  constructor() {
    effect(() => {
      const dark = this.isDarkMode();
      this.document.body.classList.toggle('dark-theme', dark);
      try {
        localStorage.setItem(DARK_MODE_STORAGE_KEY, String(dark));
      } catch {
        // Storage is unavailable (SSR, private mode); the theme still applies for this session.
      }
    });
  }

  toggleDarkMode(force?: boolean): void {
    this.isDarkMode.update((current) => force ?? !current);
  }

  /** Runs a registered action. Returns null when the action name is unknown. */
  execute(action: string, value?: string): ActionResult | null {
    switch (action) {
      case 'DARK_MODE_ON':
        this.toggleDarkMode(true);
        return { ok: true, message: 'Dark mode enabled.' };
      case 'DARK_MODE_OFF':
        this.toggleDarkMode(false);
        return { ok: true, message: 'Light mode enabled.' };
      case 'UPDATE_NAME': {
        const error = this.userProfile.updateName(value ?? '');
        return error
          ? { ok: false, message: `I couldn't update your name: ${error}` }
          : { ok: true, message: `Your name is now ${this.userProfile.profile().name}.` };
      }
      case 'UPDATE_EMAIL': {
        const error = this.userProfile.updateEmail(value ?? '');
        return error
          ? { ok: false, message: `I couldn't update your email: ${error}` }
          : { ok: true, message: `Your email is now ${this.userProfile.profile().email}.` };
      }
      default:
        return null;
    }
  }
}

function readStoredDarkMode(): boolean {
  try {
    return localStorage.getItem(DARK_MODE_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

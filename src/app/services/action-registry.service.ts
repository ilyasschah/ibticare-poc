import { DOCUMENT } from '@angular/common';
import { Injectable, effect, inject, signal } from '@angular/core';

const DARK_MODE_STORAGE_KEY = 'ibticare.darkMode';

/** Actions the assistant can trigger with `[ACTION:<NAME>]` tags. */
@Injectable({ providedIn: 'root' })
export class ActionRegistryService {
  private readonly document = inject(DOCUMENT);

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

  /** Runs a registered action. Returns false when the name is unknown. */
  execute(action: string): boolean {
    switch (action) {
      case 'DARK_MODE_ON':
        this.toggleDarkMode(true);
        return true;
      case 'DARK_MODE_OFF':
        this.toggleDarkMode(false);
        return true;
      default:
        return false;
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

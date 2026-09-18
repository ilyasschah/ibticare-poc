import { DOCUMENT } from '@angular/common';
import { Injectable, effect, inject, signal } from '@angular/core';

const STORAGE_KEY = 'ibticare.darkMode';

/** Light/dark theme. Owns the `dark-theme` class on `<body>` and remembers the choice. */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);

  readonly isDarkMode = signal(readStored());

  constructor() {
    effect(() => {
      const dark = this.isDarkMode();
      this.document.body.classList.toggle('dark-theme', dark);
      try {
        localStorage.setItem(STORAGE_KEY, String(dark));
      } catch {
        // Storage is unavailable (SSR, private mode); the theme still applies for this session.
      }
    });
  }

  setDarkMode(dark: boolean): void {
    this.isDarkMode.set(dark);
  }

  toggle(): void {
    this.isDarkMode.update((dark) => !dark);
  }
}

function readStored(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

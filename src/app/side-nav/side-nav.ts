import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterRenderEffect,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NAV_LINKS } from '../navigation';

const FOCUSABLE = 'a[href], button:not([disabled])';

/**
 * Hamburger button plus the navigation drawer it opens.
 *
 * The drawer is modal — it covers the page behind a scrim — so it traps Tab, closes on Escape and
 * returns focus to the hamburger. The host page is expected to mark its own content `inert` while
 * {@link isOpen} is true, which is what makes `aria-modal` on the drawer true.
 */
@Component({
  selector: 'app-side-nav',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './side-nav.html',
  styleUrl: './side-nav.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SideNav {
  private readonly drawer = viewChild.required<ElementRef<HTMLElement>>('drawer');
  private readonly toggleButton = viewChild.required<ElementRef<HTMLButtonElement>>('toggleButton');

  readonly isOpen = signal(false);
  protected readonly links = NAV_LINKS;

  constructor() {
    let wasOpen = false;
    afterRenderEffect(() => {
      const open = this.isOpen();
      if (open === wasOpen) return;
      wasOpen = open;
      // Move focus to the first destination on open, and back to the hamburger on close.
      if (open) this.drawer().nativeElement.querySelector<HTMLElement>('nav a')?.focus();
      else this.toggleButton().nativeElement.focus();
    });
  }

  toggle(): void {
    this.isOpen.update((open) => !open);
  }

  close(): void {
    this.isOpen.set(false);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.close();
      return;
    }
    if (event.key !== 'Tab') return;

    // Keep Tab inside the drawer while it covers the page.
    const items = this.focusable();
    if (!items.length) return;
    const edge = event.shiftKey ? items[0] : items[items.length - 1];
    if (document.activeElement !== edge) return;

    event.preventDefault();
    (event.shiftKey ? items[items.length - 1] : items[0]).focus();
  }

  private focusable(): HTMLElement[] {
    return [...this.drawer().nativeElement.querySelectorAll<HTMLElement>(FOCUSABLE)];
  }
}

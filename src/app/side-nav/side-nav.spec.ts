import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { NAV_LINKS, SideNav } from './side-nav';

/** Stub routes so clicking a drawer link actually navigates. */
const TEST_ROUTES = NAV_LINKS.map((link) => ({ path: link.path.slice(1), children: [] }));

describe('SideNav', () => {
  let fixture: ComponentFixture<SideNav>;
  let component: SideNav;
  let el: HTMLElement;

  const toggleButton = () => el.querySelector<HTMLButtonElement>('.nav-toggle')!;
  const drawer = () => el.querySelector<HTMLElement>('#app-drawer')!;
  const links = () => [...el.querySelectorAll<HTMLAnchorElement>('.drawer-link')];

  async function open() {
    toggleButton().click();
    await fixture.whenStable();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SideNav],
      providers: [provideRouter(TEST_ROUTES)],
    }).compileComponents();

    fixture = TestBed.createComponent(SideNav);
    component = fixture.componentInstance;
    el = fixture.nativeElement as HTMLElement;
    // The focus assertions below need the component in the live document.
    document.body.appendChild(el);
    await fixture.whenStable();
  });

  afterEach(() => {
    el.remove();
  });

  it('renders the three destinations', () => {
    expect(links().map((a) => a.textContent?.trim())).toEqual(['Dashboard', 'Profile', 'Settings']);
  });

  it('starts closed and keeps the drawer out of the tab order', () => {
    expect(component.isOpen()).toBe(false);
    expect(toggleButton().getAttribute('aria-expanded')).toBe('false');
    expect(drawer().hasAttribute('inert')).toBe(true);
    expect(drawer().classList.contains('drawer-open')).toBe(false);
  });

  it('opens on the hamburger and moves focus into the drawer', async () => {
    await open();

    expect(component.isOpen()).toBe(true);
    expect(toggleButton().getAttribute('aria-expanded')).toBe('true');
    expect(drawer().hasAttribute('inert')).toBe(false);
    expect(drawer().classList.contains('drawer-open')).toBe(true);
    expect(document.activeElement).toBe(links()[0]);
  });

  it('closes on Escape and returns focus to the hamburger', async () => {
    await open();

    drawer().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await fixture.whenStable();

    expect(component.isOpen()).toBe(false);
    expect(document.activeElement).toBe(toggleButton());
  });

  it('closes when the scrim is clicked', async () => {
    await open();

    el.querySelector<HTMLElement>('.scrim')!.click();
    await fixture.whenStable();

    expect(component.isOpen()).toBe(false);
  });

  it('closes when a destination is chosen', async () => {
    await open();

    links()[1].click();
    await fixture.whenStable();

    expect(component.isOpen()).toBe(false);
  });

  it('keeps Tab inside the drawer', async () => {
    await open();
    const focusable = [...drawer().querySelectorAll<HTMLElement>('a[href], button')];
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    last.focus();
    drawer().dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    expect(document.activeElement).toBe(first);

    drawer().dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }),
    );
    expect(document.activeElement).toBe(last);
  });
});

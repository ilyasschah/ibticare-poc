import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppComponent } from './app';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the drawer navigation and the chatbot', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.nav-toggle')).toBeTruthy();
    expect(compiled.querySelectorAll('nav a').length).toBe(3);
    expect(compiled.querySelector('app-chatbot')).toBeTruthy();
  });

  it('makes the page inert only while the drawer is open', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const main = compiled.querySelector('main')!;
    expect(main.hasAttribute('inert')).toBe(false);

    compiled.querySelector<HTMLButtonElement>('.nav-toggle')!.click();
    await fixture.whenStable();

    expect(main.hasAttribute('inert')).toBe(true);
    expect(compiled.querySelector('app-chatbot')!.hasAttribute('inert')).toBe(true);
  });
});

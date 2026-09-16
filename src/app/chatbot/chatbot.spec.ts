import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { Chatbot } from './chatbot';
import { OllamaService } from './ollama';
import { ActionRegistryService } from '../services/action-registry.service';
import { UserProfileService } from '../services/user-profile.service';

describe('Chatbot', () => {
  let component: Chatbot;
  let fixture: ComponentFixture<Chatbot>;
  const chat = vi.fn<(prompt: string) => Promise<string>>();

  beforeEach(async () => {
    try { localStorage.clear(); } catch { /* Node may expose a non-functional localStorage. */ }
    document.body.classList.remove('dark-theme');
    chat.mockReset();

    await TestBed.configureTestingModule({
      imports: [Chatbot],
      providers: [provideRouter([]), { provide: OllamaService, useValue: { chat } }],
    }).compileComponents();

    fixture = TestBed.createComponent(Chatbot);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  async function send(text: string): Promise<string> {
    const input = document.createElement('input');
    input.value = text;
    await component.sendMessage(input);
    TestBed.tick();
    return component.messages[component.messages.length - 1].text;
  }

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('calls ollama.chat with only the prompt', async () => {
    chat.mockResolvedValue('You have $54,200.');
    expect(await send('How much money do I have?')).toBe('You have $54,200.');
    expect(chat).toHaveBeenCalledWith('How much money do I have?');
  });

  it('turns dark mode on and off from action tags and strips the tags', async () => {
    chat.mockResolvedValue('Dark mode enabled! [ACTION:DARK_MODE_ON]');
    expect(await send('turn on dark mode')).toBe('Dark mode enabled!');
    expect(document.body.classList.contains('dark-theme')).toBe(true);

    chat.mockResolvedValue('[ACTION:DARK_MODE_OFF]');
    expect(await send('switch to light mode')).toBe('Light mode enabled.');
    expect(document.body.classList.contains('dark-theme')).toBe(false);
  });

  it('runs both NAV and ACTION tags from one reply', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    chat.mockResolvedValue('On it! [NAV:SETTINGS] [ACTION:DARK_MODE_ON]');

    expect(await send('open settings in dark mode')).toBe('On it!');
    expect(navigate).toHaveBeenCalledWith(['/settings']);
    expect(TestBed.inject(ActionRegistryService).isDarkMode()).toBe(true);
  });

  it('updates the profile from a tagged reply', async () => {
    chat.mockResolvedValue('Sure, updating your name. [ACTION:UPDATE_NAME:Sarah Connor]');
    expect(await send('Change my name to Sarah Connor')).toBe('Sure, updating your name.');
    expect(TestBed.inject(UserProfileService).profile().name).toBe('Sarah Connor');
  });

  it('reports a failed action even when the model claims success', async () => {
    const profile = TestBed.inject(UserProfileService);
    const before = profile.profile().email;
    chat.mockResolvedValue('Your email has been updated! [ACTION:UPDATE_EMAIL:not-an-email]');

    const text = await send('change my email to not-an-email');

    expect(text).toContain('Your email has been updated!');
    expect(text).toContain("I couldn't update your email");
    expect(profile.profile().email).toBe(before);
  });

  it('falls back to a navigation message when the reply is only a NAV tag', async () => {
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    chat.mockResolvedValue('[NAV:PROFILE]');
    expect(await send('go to profile')).toBe('Navigating there now!');
  });
});

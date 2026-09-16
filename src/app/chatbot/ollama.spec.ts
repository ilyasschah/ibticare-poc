import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { OllamaService } from './ollama';
import { ScreenContextService } from '../services/screen-context.service';
import { ActionRegistryService } from '../services/action-registry.service';

describe('OllamaService', () => {
  let service: OllamaService;
  let screenContext: ScreenContextService;
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    service = TestBed.inject(OllamaService);
    screenContext = TestBed.inject(ScreenContextService);
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  function sentSystemPrompt(): string {
    const init = fetchSpy.mock.calls[0][1] as RequestInit;
    const body = JSON.parse(init.body as string) as { messages: { role: string; content: string }[] };
    return body.messages.find((m) => m.role === 'system')!.content;
  }

  it('sends the screen context and the user prompt, and returns the reply', async () => {
    screenContext.setPageTitle('Dashboard');
    screenContext.setMetrics({ balance: '$54,200', activeUsers: 120 });
    fetchSpy.mockResolvedValue(new Response(JSON.stringify({ message: { content: 'You have $54,200.' } })));

    const reply = await service.chat('How much money do I have?');

    expect(reply).toBe('You have $54,200.');
    const prompt = sentSystemPrompt();
    expect(prompt).toContain('Page title: "Dashboard"');
    expect(prompt).toContain('"balance":"$54,200"');
    expect(prompt).toContain('"activeUsers":120');
    const body = JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string);
    expect(body.messages[1]).toEqual({ role: 'user', content: 'How much money do I have?' });
  });

  it('describes the dark mode actions and the current theme', async () => {
    TestBed.inject(ActionRegistryService).toggleDarkMode(true);
    fetchSpy.mockResolvedValue(new Response(JSON.stringify({ message: { content: 'ok' } })));

    await service.chat('turn on dark mode');

    const prompt = sentSystemPrompt();
    expect(prompt).toContain('[ACTION:DARK_MODE_ON]');
    expect(prompt).toContain('[ACTION:DARK_MODE_OFF]');
    expect(prompt).toContain('Dark mode is currently ON');
  });

  it('reports HTTP and connection errors', async () => {
    fetchSpy.mockResolvedValueOnce(new Response('', { status: 500, statusText: 'Server Error' }));
    expect(await service.chat('hi')).toBe('Error 500: Server Error');

    fetchSpy.mockRejectedValueOnce(new Error('refused'));
    expect(await service.chat('hi')).toBe('Connection Failed: refused');
  });
});

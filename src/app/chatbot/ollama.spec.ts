import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { OllamaService } from './ollama';
import { OLLAMA_HOSTS } from './ollama-hosts';
import { ScreenContextService } from '../services/screen-context.service';
import { ActionRegistryService } from '../services/action-registry.service';

describe('OllamaService', () => {
  let service: OllamaService;
  let screenContext: ScreenContextService;
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    try { localStorage.clear(); } catch { /* Node may expose a non-functional localStorage. */ }
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    service = TestBed.inject(OllamaService);
    screenContext = TestBed.inject(ScreenContextService);
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  /** Answers /api/tags only for the given hosts; everything else is refused. */
  function onlyReachable(reachable: Record<string, string[]>) {
    fetchSpy.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      const host = Object.keys(reachable).find((h) => url.startsWith(h));
      if (!host) return Promise.reject(new Error('refused'));
      return Promise.resolve(
        new Response(JSON.stringify({ models: reachable[host].map((name) => ({ name })) })),
      );
    });
  }

  function sentSystemPrompt(): string {
    const init = fetchSpy.mock.calls[0][1] as RequestInit;
    const body = JSON.parse(init.body as string) as {
      messages: { role: string; content: string }[];
    };
    return body.messages.find((m) => m.role === 'system')!.content;
  }

  it('sends the screen context and the user prompt, and returns the reply', async () => {
    screenContext.setPageTitle('Dashboard');
    screenContext.setMetrics({ balance: '$54,200', activeUsers: 120 });
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ message: { content: 'You have $54,200.' } })),
    );

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

  it('describes the profile update actions', async () => {
    fetchSpy.mockResolvedValue(new Response(JSON.stringify({ message: { content: 'ok' } })));

    await service.chat('change my name');

    const prompt = sentSystemPrompt();
    expect(prompt).toContain('[ACTION:UPDATE_NAME:New Name]');
    expect(prompt).toContain('[ACTION:UPDATE_EMAIL:new.email@example.com]');
  });

  it('reports HTTP errors, and names the unreachable server on a connection error', async () => {
    fetchSpy.mockResolvedValueOnce(new Response('', { status: 500, statusText: 'Server Error' }));
    expect(await service.chat('hi')).toBe('Error 500: Server Error');

    fetchSpy.mockRejectedValueOnce(new Error('refused'));
    const reply = await service.chat('hi');
    expect(reply).toContain(service.baseUrl());
    expect(reply).toContain('refused');
    expect(service.status()).toBe('offline');
  });

  describe('discovery', () => {
    const REMOTE = 'http://desktop-ai:11434';

    it('falls back to a tailnet host when nothing is running locally', async () => {
      expect(OLLAMA_HOSTS).toContain(REMOTE);
      onlyReachable({ [REMOTE]: ['qwen2.5-coder:7b'] });

      expect(await service.ensureConnected()).toBe(true);
      expect(service.baseUrl()).toBe(REMOTE);
      expect(service.status()).toBe('online');
      expect(service.models()).toEqual(['qwen2.5-coder:7b']);
    });

    it('prefers a local server over a remote one', async () => {
      onlyReachable({
        'http://127.0.0.1:11434': ['local-model'],
        [REMOTE]: ['remote-model'],
      });

      await service.ensureConnected();

      expect(service.baseUrl()).toBe('http://127.0.0.1:11434');
    });

    it('goes offline when no host answers', async () => {
      onlyReachable({});

      expect(await service.ensureConnected()).toBe(false);
      expect(service.status()).toBe('offline');
      expect(service.models()).toEqual([]);
    });

    it('switches to a model the server actually has', async () => {
      service.selectedModel.set('a-model-that-was-deleted');
      onlyReachable({ [REMOTE]: ['qwen2.5-coder:7b', 'gpt-oss:20b'] });

      await service.ensureConnected();

      expect(service.selectedModel()).toBe('qwen2.5-coder:7b');
    });

    it('normalizes a manually entered host and remembers it', async () => {
      onlyReachable({ [REMOTE]: ['qwen2.5-coder:7b'] });

      expect(await service.connectTo('  desktop-ai:11434/  ')).toBe(true);
      expect(service.baseUrl()).toBe(REMOTE);

      TestBed.tick(); // The persistence effect runs with change detection.
      expect(localStorage.getItem('ibticare.ollama.baseUrl')).toBe(REMOTE);
    });

    it('gives up on a host that never answers', async () => {
      fetchSpy.mockImplementation(
        (_input: RequestInfo | URL, init?: RequestInit) =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () => reject(new Error('TimeoutError')));
          }),
      );

      expect(await service.ensureConnected()).toBe(false);
      expect(service.status()).toBe('offline');
    }, 10_000);
  });
});

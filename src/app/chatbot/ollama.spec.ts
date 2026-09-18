import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { OllamaService } from './ollama';
import { OLLAMA_HOSTS } from './ollama-hosts';
import { AgentPromptService } from '../agent/agent-prompt.service';

describe('OllamaService', () => {
  let service: OllamaService;
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  const buildPrompt = vi.fn(() => 'SYSTEM PROMPT FROM THE AGENT LAYER');

  beforeEach(() => {
    try {
      localStorage.clear();
    } catch {
      /* Node may expose a non-functional localStorage. */
    }
    buildPrompt.mockClear();

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AgentPromptService, useValue: { build: buildPrompt } },
      ],
    });
    service = TestBed.inject(OllamaService);
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

  function sentMessages(): { role: string; content: string }[] {
    const init = fetchSpy.mock.calls[0][1] as RequestInit;
    return (JSON.parse(init.body as string) as { messages: { role: string; content: string }[] })
      .messages;
  }

  it('sends the agent prompt as the system message and returns the reply', async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ message: { content: 'You have $54,200.' } })),
    );

    const reply = await service.chat('How much money do I have?');

    expect(reply).toBe('You have $54,200.');
    expect(buildPrompt).toHaveBeenCalledOnce();
    expect(sentMessages()).toEqual([
      { role: 'system', content: 'SYSTEM PROMPT FROM THE AGENT LAYER' },
      { role: 'user', content: 'How much money do I have?' },
    ]);
  });

  it('rebuilds the prompt on every message, so answers track live data', async () => {
    fetchSpy.mockResolvedValue(new Response(JSON.stringify({ message: { content: 'ok' } })));

    await service.chat('first');
    await service.chat('second');

    expect(buildPrompt).toHaveBeenCalledTimes(2);
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

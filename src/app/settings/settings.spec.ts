import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { Settings } from './settings';
import { OllamaService } from '../chatbot/ollama';

describe('Settings', () => {
  let fixture: ComponentFixture<Settings>;
  let ollama: OllamaService;
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  const REMOTE = 'http://desktop-ai:11434';

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

  async function create() {
    fixture = TestBed.createComponent(Settings);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  beforeEach(() => {
    try {
      localStorage.clear();
    } catch {
      /* Node may expose a non-functional localStorage. */
    }
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    ollama = TestBed.inject(OllamaService);
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('shows the discovered server and its models', async () => {
    onlyReachable({ [REMOTE]: ['qwen2.5-coder:7b', 'gpt-oss:20b'] });

    const el = await create();

    const status = el.querySelector('.status')?.textContent ?? '';
    expect(status).toContain('Connected');
    expect(status).toContain(REMOTE);
    expect([...el.querySelectorAll('option')].map((o) => o.textContent?.trim())).toEqual([
      'qwen2.5-coder:7b',
      'gpt-oss:20b',
    ]);
    expect(el.querySelector<HTMLInputElement>('#ollama-url')?.value).toBe(REMOTE);
  });

  it('lists the hosts it tried when nothing answers', async () => {
    onlyReachable({});

    const el = await create();

    expect(el.querySelector('.status')?.textContent).toContain('Unreachable');
    expect(el.querySelector<HTMLSelectElement>('#ollama-model')?.disabled).toBe(true);
    const tried = [...el.querySelectorAll('.troubleshoot li')].map((li) => li.textContent?.trim());
    expect(tried).toContain(REMOTE);
  });

  it('connects to a manually entered server and remembers it', async () => {
    onlyReachable({ [REMOTE]: ['qwen2.5-coder:7b'] });
    const el = await create();

    const input = el.querySelector<HTMLInputElement>('#ollama-url')!;
    input.value = 'http://100.102.45.66:11434';
    input.dispatchEvent(new Event('input'));
    onlyReachable({ 'http://100.102.45.66:11434': ['gpt-oss:20b'] });
    el.querySelector<HTMLButtonElement>('button[type=submit]')!.click();
    await fixture.whenStable();

    expect(ollama.baseUrl()).toBe('http://100.102.45.66:11434');
    expect(localStorage.getItem('ibticare.ollama.baseUrl')).toBe('http://100.102.45.66:11434');
  });
});

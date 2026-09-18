import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { AgentActionService } from './agent-action.service';
import { AgentContextService } from './agent-context.service';
import { AgentPromptService } from './agent-prompt.service';
import { provideAgent } from './provide-agent';
import { OllamaService } from '../chatbot/ollama';
import { ThemeService } from '../services/theme.service';
import { UserProfileService } from '../services/user-profile.service';
import { routes } from '../app.routes';

/** Enough of OllamaService for the settings domain, without touching the network. */
const ollamaStub = {
  baseUrl: () => 'http://desktop-ai:11434',
  status: () => 'online' as const,
  selectedModel: Object.assign(() => 'qwen2.5-coder:1.5b', { set: vi.fn() }),
  models: () => ['qwen2.5-coder:1.5b', 'qwen2.5-coder:7b'],
};

describe('agent runtime', () => {
  let context: AgentContextService;
  let actions: AgentActionService;
  let prompt: AgentPromptService;

  beforeEach(() => {
    try {
      localStorage.clear();
    } catch {
      /* Node may expose a non-functional localStorage. */
    }
    ollamaStub.selectedModel.set.mockReset();

    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        provideAgent(),
        { provide: OllamaService, useValue: ollamaStub },
      ],
    });

    context = TestBed.inject(AgentContextService);
    actions = TestBed.inject(AgentActionService);
    prompt = TestBed.inject(AgentPromptService);
  });

  describe('context', () => {
    it('registers every domain once at startup', () => {
      expect(context.domainIds().sort()).toEqual(['dashboard', 'profile', 'settings']);
    });

    it('exposes all domains regardless of the current screen', () => {
      const { data } = context.snapshot();
      expect(data['profile']['name']).toBe('Alex Morgan');
      expect(data['dashboard']['bestCustomer']).toEqual({
        customer: 'Umbrella Health',
        totalPaidAndPending: '$15,700.00',
      });
      expect(data['settings']['ollamaUrl']).toBe('http://desktop-ai:11434');
    });

    it('reads live values rather than a copy taken at registration', () => {
      TestBed.inject(UserProfileService).updateName('Sarah Connor');
      expect(context.snapshot().data['profile']['name']).toBe('Sarah Connor');

      TestBed.inject(ThemeService).setDarkMode(true);
      expect(context.snapshot().data['settings']['darkMode']).toBe(true);
    });

    it('tracks the screen the user is on', async () => {
      await TestBed.inject(Router).navigate(['/profile']);
      expect(context.screen()).toEqual({
        route: '/profile',
        title: 'Profile',
        domain: 'profile',
      });
    });
  });

  describe('prompt', () => {
    it('carries every domain, so a question can be answered from any screen', async () => {
      await TestBed.inject(Router).navigate(['/settings']);
      const text = prompt.build();

      // Standing on Settings, but the dashboard and profile answers are both in the prompt.
      expect(text).toContain('Page: "Settings"');
      expect(text).toContain('Umbrella Health');
      expect(text).toContain('Alex Morgan');
    });

    it('documents each registered action from the registry', () => {
      const text = prompt.build();
      for (const action of actions.actions()) {
        expect(text).toContain(action.example);
        expect(text).toContain(action.description);
      }
      expect(text).toContain('[NAV:DASHBOARD]');
      expect(text).toContain('[ACTION:SET_MODEL:qwen2.5-coder:7b]');
    });

    it('ends with worked examples that answer questions without emitting a tag', () => {
      const text = prompt.build();
      const examples = text.slice(text.indexOf('EXAMPLES'));

      expect(examples).toContain('Your name is Alex Morgan.');
      expect(examples).toContain('Umbrella Health, with $15,700.00 paid and pending.');
      // The last line must be an answer, not a tag: it is what a small model imitates most.
      const lines = text.trimEnd().split('\n');
      expect(lines.at(-1)).toMatch(/^You: [^[]+$/);
    });

    it('picks up a newly registered domain without any change to the builder', () => {
      context.register({
        id: 'billing',
        description: 'Outstanding invoices.',
        snapshot: () => ({ overdueInvoices: 2 }),
      });

      const text = prompt.build();
      expect(text).toContain('billing: Outstanding invoices.');
      expect(text).toContain('"overdueInvoices":2');
    });
  });

  describe('actions', () => {
    it('returns null for a name nothing registered', () => {
      expect(actions.execute('ACTION', 'LAUNCH_ROCKET')).toBeNull();
    });

    it('resolves a tag whose kind the model omitted', () => {
      const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

      expect(actions.execute(undefined, 'PROFILE')).toEqual({
        ok: true,
        message: 'Opening Profile.',
      });
      expect(navigate).toHaveBeenCalledWith(['/profile']);
    });

    it('refuses a model the server does not have', () => {
      const result = actions.execute('ACTION', 'SET_MODEL', 'gpt-9');
      expect(result).toEqual({
        ok: false,
        message: '"gpt-9" isn\'t on the server. Available: qwen2.5-coder:1.5b, qwen2.5-coder:7b.',
      });
      expect(ollamaStub.selectedModel.set).not.toHaveBeenCalled();
    });

    it('switches to a model the server does have', () => {
      const result = actions.execute('ACTION', 'SET_MODEL', 'qwen2.5-coder:7b');
      expect(result?.ok).toBe(true);
      expect(ollamaStub.selectedModel.set).toHaveBeenCalledWith('qwen2.5-coder:7b');
    });

    it('reports a rejected value instead of claiming success', () => {
      const result = actions.execute('ACTION', 'UPDATE_EMAIL', 'not-an-email');
      expect(result?.ok).toBe(false);
      expect(TestBed.inject(UserProfileService).profile().email).toBe('alex.morgan@ibticare.com');
    });

    it('contains a throwing action instead of breaking the reply', () => {
      actions.register({
        kind: 'ACTION',
        name: 'EXPLODE',
        description: 'Throws.',
        example: '[ACTION:EXPLODE]',
        run: () => {
          throw new Error('boom');
        },
      });

      expect(actions.execute('ACTION', 'EXPLODE')).toEqual({
        ok: false,
        message: "I couldn't complete that: boom",
      });
    });
  });
});

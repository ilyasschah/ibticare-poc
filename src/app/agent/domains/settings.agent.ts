import { inject } from '@angular/core';
import { AgentActionService } from '../agent-action.service';
import { AgentContextService } from '../agent-context.service';
import { OllamaService } from '../../chatbot/ollama';
import { ThemeService } from '../../services/theme.service';

/** Exposes the assistant's own connection and the app's appearance, and lets it change both. */
export function registerSettingsDomain(): void {
  const context = inject(AgentContextService);
  const actions = inject(AgentActionService);
  const ollama = inject(OllamaService);
  const theme = inject(ThemeService);

  context.register({
    id: 'settings',
    description: 'The Ollama server this assistant runs on, and the current theme.',
    snapshot: () => ({
      ollamaUrl: ollama.baseUrl(),
      connection: ollama.status(),
      currentModel: ollama.selectedModel(),
      availableModels: [...ollama.models()],
      darkMode: theme.isDarkMode(),
    }),
  });

  actions.register({
    kind: 'ACTION',
    name: 'DARK_MODE_ON',
    description: 'Switch the application to the dark theme.',
    example: '[ACTION:DARK_MODE_ON]',
    run: () => {
      theme.setDarkMode(true);
      return { ok: true, message: 'Dark mode enabled.' };
    },
  });

  actions.register({
    kind: 'ACTION',
    name: 'DARK_MODE_OFF',
    description: 'Switch the application back to the light theme.',
    example: '[ACTION:DARK_MODE_OFF]',
    run: () => {
      theme.setDarkMode(false);
      return { ok: true, message: 'Light mode enabled.' };
    },
  });

  actions.register({
    kind: 'ACTION',
    name: 'SET_MODEL',
    description: 'Switch to a different model. Only names in settings.availableModels will work.',
    parameter: 'the exact model name',
    example: '[ACTION:SET_MODEL:qwen2.5-coder:7b]',
    run: (value) => {
      const requested = value?.trim() ?? '';
      const available = ollama.models();
      if (!available.length) {
        return { ok: false, message: "I can't switch models while the server is unreachable." };
      }
      if (!available.includes(requested)) {
        return {
          ok: false,
          message: `"${requested}" isn't on the server. Available: ${available.join(', ')}.`,
        };
      }
      ollama.selectedModel.set(requested);
      return { ok: true, message: `Switched to ${requested}. It applies from your next message.` };
    },
  });
}

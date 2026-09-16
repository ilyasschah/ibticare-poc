import { Injectable, inject } from '@angular/core';
import { ActionRegistryService } from '../services/action-registry.service';
import { ScreenContextService } from '../services/screen-context.service';

interface OllamaTagsResponse {
  models: { name: string }[];
}

interface OllamaChatResponse {
  message: { content: string };
}

@Injectable({
  providedIn: 'root'
})
export class OllamaService {
  private readonly screenContext = inject(ScreenContextService);
  private readonly actions = inject(ActionRegistryService);

  public baseUrl: string = 'http://127.0.0.1:11434';
  public selectedModel: string = 'qwen2.5-coder:1.5b';

  async ping(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/`);
      return res.ok;
    } catch {
      return false;
    }
  }

  async getModels(): Promise<string[]> {
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`);
      const data = (await res.json()) as OllamaTagsResponse;
      return data.models.map((m) => m.name);
    } catch {
      return [];
    }
  }

  async chat(prompt: string): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.selectedModel,
          messages: [
            { role: 'system', content: this.buildSystemPrompt() },
            { role: 'user', content: prompt }
          ],
          stream: false
        })
      });

      if (!response.ok) return `Error ${response.status}: ${response.statusText}`;
      const data = (await response.json()) as OllamaChatResponse;
      return data.message.content;
    } catch (error: unknown) {
      return `Connection Failed: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  buildSystemPrompt(): string {
    const { pageTitle, route, metrics } = this.screenContext.context();
    const theme = this.actions.isDarkMode() ? 'ON' : 'OFF';

    return `You are the ibticare desktop assistant.

CURRENT SCREEN:
- Page title: "${pageTitle}"
- Route: "${route}"
- Visible data (JSON): ${JSON.stringify(metrics)}
- Dark mode is currently ${theme}.

RULES:
1. If the user asks where they are, answer using the current screen context. DO NOT output tags.
2. When the user asks about data (e.g. "How many pending transactions are there?"), answer ONLY from Visible data.
   Prefer the precomputed summary values over doing math yourself.
   If the value is not there, say you cannot see it on this screen. Never invent numbers.
3. ONLY output a navigation tag if the user explicitly asks to GO, OPEN, or NAVIGATE to a page:
   - Go to Settings: [NAV:SETTINGS]
   - Go to Profile: [NAV:PROFILE]
   - Go to Dashboard: [NAV:DASHBOARD]
4. ONLY output a theme tag if the user explicitly asks to change the theme:
   - Enable dark mode: [ACTION:DARK_MODE_ON]
   - Disable dark mode / switch to light mode: [ACTION:DARK_MODE_OFF]
5. You CAN update the user's profile. ONLY output a profile tag if the user explicitly asks to change their name or email.
   Put the new value after the second colon, without quotes:
   - Change name: [ACTION:UPDATE_NAME:New Name]
   - Change email: [ACTION:UPDATE_EMAIL:new.email@example.com]
   Example: user says "Change my name to Sarah Connor" -> "Sure, updating your name. [ACTION:UPDATE_NAME:Sarah Connor]"
   The user's role cannot be changed by you; tell them to edit it on the Profile page.
6. Always include a short friendly response along with any tag.`;
  }
}

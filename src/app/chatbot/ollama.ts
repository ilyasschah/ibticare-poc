import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class OllamaService {
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
      const data = await res.json();
      return data.models.map((m: any) => m.name);
    } catch {
      return [];
    }
  }

  async chat(prompt: string, currentRoute: string): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.selectedModel,
          messages: [
            { 
              role: 'system', 
              content: `You are the ibticare desktop assistant.
              Context: The user is currently on route: "${currentRoute}".

              RULES:
              1. If the user asks where they are, answer using the current route context. DO NOT output navigation tags.
              2. ONLY output a navigation tag if the user explicitly asks to GO, OPEN, or NAVIGATE to a page:
                 - Go to Settings: [NAV:SETTINGS]
                 - Go to Profile: [NAV:PROFILE]
                 - Go to Dashboard: [NAV:DASHBOARD]
              3. Always include a short friendly response along with the tag if navigating.` 
            },
            { role: 'user', content: prompt }
          ],
          stream: false
        })
      });
      
      if (!response.ok) return `Error ${response.status}: ${response.statusText}`;
      const data = await response.json();
      return data.message.content;
    } catch (error: any) {
      return `Connection Failed: ${error?.message || error}`;
    }
  }
}
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

  async chat(prompt: string): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.selectedModel,
          messages: [
            { 
              role: 'system', 
              content: `You are the ibticare assistant. 
              You help users navigate the app. 
              If the user asks to open or go to a page, output one of these exact tags:
              - For Settings page: [NAV:SETTINGS]
              - For Profile page: [NAV:PROFILE]
              - For Dashboard page: [NAV:DASHBOARD]
              Be polite and brief.` 
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
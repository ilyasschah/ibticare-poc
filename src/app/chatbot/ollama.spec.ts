import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class OllamaService {
  async chat(prompt: string): Promise<string> {
    try {
      const response = await fetch('http://localhost:11434/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'qwen2.5-coder:1.5b', // Using your specific model
          messages: [{ role: 'user', content: prompt }],
          stream: false // We will keep it simple and wait for the full response for now
        })
      });
      
      const data = await response.json();
      return data.message.content;
    } catch (error) {
      console.error('Ollama Error:', error);
      return "Error: Could not connect to Ollama. Make sure the Ollama app is running on your PC!";
    }
  }
}
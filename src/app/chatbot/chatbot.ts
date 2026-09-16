import { Component, inject } from '@angular/core';
import { OllamaService } from './ollama.spec';

@Component({
  selector: 'app-chatbot',
  standalone: true,
  templateUrl: './chatbot.html',
  styleUrl: './chatbot.css'
})
export class Chatbot {
  private ollama = inject(OllamaService);
  
  // The array holding our conversation history
  messages: { text: string, isBot: boolean }[] = [
    { text: 'Hello! I am your ibticare agent. Ask me anything!', isBot: true }
  ];

  async sendMessage(inputBox: HTMLInputElement) {
    const text = inputBox.value.trim();
    if (!text) return; // Don't send empty messages

    // 1. Add user message to UI and clear the input box
    this.messages.push({ text: text, isBot: false });
    inputBox.value = ''; 

    // 2. Add a temporary loading message for the bot
    this.messages.push({ text: 'Thinking...', isBot: true });

    // 3. Call Ollama and wait for the response
    const reply = await this.ollama.chat(text);

    // 4. Replace the "Thinking..." text with the actual AI answer
    this.messages[this.messages.length - 1].text = reply;
  }
}
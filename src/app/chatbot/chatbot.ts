import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { OllamaService } from './ollama';

@Component({
  selector: 'app-chatbot',
  standalone: true,
  templateUrl: './chatbot.html',
  styleUrl: './chatbot.css'
})
export class Chatbot {
  private ollama = inject(OllamaService);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);
  
  messages: { text: string, isBot: boolean }[] = [
    { text: 'Hello! I am your ibticare agent. Ask me to navigate anywhere!', isBot: true }
  ];

  async sendMessage(inputBox: HTMLInputElement) {
    const text = inputBox.value.trim();
    if (!text) return;

    this.messages.push({ text: text, isBot: false });
    inputBox.value = ''; 

    this.messages.push({ text: 'Thinking...', isBot: true });
    this.cdr.detectChanges();

    let reply = await this.ollama.chat(text);

    // Parse navigation tags and update route
    if (reply.includes('[NAV:SETTINGS]')) {
      this.router.navigate(['/settings']);
      reply = reply.replace('[NAV:SETTINGS]', '').trim();
    } else if (reply.includes('[NAV:PROFILE]')) {
      this.router.navigate(['/profile']);
      reply = reply.replace('[NAV:PROFILE]', '').trim();
    } else if (reply.includes('[NAV:DASHBOARD]')) {
      this.router.navigate(['/dashboard']);
      reply = reply.replace('[NAV:DASHBOARD]', '').trim();
    }

    if (!reply) {
      reply = "Navigating there now!";
    }

    this.messages[this.messages.length - 1].text = reply;
    this.cdr.detectChanges();
  }
}
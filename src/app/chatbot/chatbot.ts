import { Component, inject, ChangeDetectorRef, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { Router } from '@angular/router';
import { OllamaService } from './ollama';
import { ActionRegistryService } from '../services/action-registry.service';
import { parseAgentTags } from './agent-tags';

const NAV_ROUTES: Record<string, string> = {
  SETTINGS: '/settings',
  PROFILE: '/profile',
  DASHBOARD: '/dashboard'
};

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [],
  templateUrl: './chatbot.html',
  styleUrl: './chatbot.css'
})
export class Chatbot implements AfterViewChecked {
  private ollama = inject(OllamaService);
  private actions = inject(ActionRegistryService);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);

  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  public isOpen: boolean = true;

  messages: { text: string, isBot: boolean }[] = [
    { text: 'Hello! I am your ibticare agent. How can I help you today?', isBot: true }
  ];

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  private scrollToBottom(): void {
    try {
      if (this.scrollContainer) {
        this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
      }
    } catch (err) {
      console.error('Scroll error:', err);
    }
  }

  toggleChat() {
    this.isOpen = !this.isOpen;
  }

  async sendMessage(inputBox: HTMLInputElement) {
    const text = inputBox.value.trim();
    if (!text) return;

    this.messages.push({ text: text, isBot: false });
    inputBox.value = '';

    this.messages.push({ text: 'Thinking...', isBot: true });
    this.cdr.detectChanges();

    const reply = await this.ollama.chat(text);

    this.messages[this.messages.length - 1].text = this.applyAgentTags(reply);
    this.cdr.detectChanges();
  }

  /** Runs every tag in the reply and returns the text to show the user. */
  private applyAgentTags(reply: string): string {
    const { text, tags } = parseAgentTags(reply);
    let navigated = false;
    let acted = false;

    for (const tag of tags) {
      if (tag.kind === 'NAV' && NAV_ROUTES[tag.name]) {
        this.router.navigate([NAV_ROUTES[tag.name]]);
        navigated = true;
      } else if (tag.kind === 'ACTION' && this.actions.execute(tag.name)) {
        acted = true;
      }
    }

    if (text) return text;
    if (navigated) return 'Navigating there now!';
    if (acted) return 'Theme updated!';
    return reply.trim();
  }
}

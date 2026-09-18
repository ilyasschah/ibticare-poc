import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterRenderEffect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { OllamaService } from './ollama';
import { AgentActionService } from '../agent/agent-action.service';
import { parseAgentTags } from '../agent/agent-tags';

export interface ChatMessage {
  text: string;
  isBot: boolean;
}

@Component({
  selector: 'app-chatbot',
  templateUrl: './chatbot.html',
  styleUrl: './chatbot.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Chatbot {
  private readonly ollama = inject(OllamaService);
  private readonly agent = inject(AgentActionService);

  private readonly scrollContainer = viewChild<ElementRef<HTMLElement>>('scrollContainer');

  readonly isOpen = signal(true);
  readonly messages = signal<readonly ChatMessage[]>([
    { text: 'Hello! I am your ibticare agent. How can I help you today?', isBot: true },
  ]);

  constructor() {
    // Keep the newest message in view; re-runs after render whenever the list changes.
    afterRenderEffect(() => {
      this.messages();
      const container = this.scrollContainer()?.nativeElement;
      if (container) container.scrollTop = container.scrollHeight;
    });
  }

  toggleChat(): void {
    this.isOpen.update((open) => !open);
  }

  async sendMessage(inputBox: HTMLInputElement): Promise<void> {
    const text = inputBox.value.trim();
    if (!text) return;

    inputBox.value = '';
    this.messages.update((list) => [
      ...list,
      { text, isBot: false },
      { text: 'Thinking...', isBot: true },
    ]);

    const reply = this.applyAgentTags(await this.ollama.chat(text));
    this.messages.update((list) => [...list.slice(0, -1), { text: reply, isBot: true }]);
  }

  /** Runs every tag in the reply through the agent registry and returns the text to show. */
  private applyAgentTags(reply: string): string {
    const { text, tags } = parseAgentTags(reply);
    const confirmations: string[] = [];
    const failures: string[] = [];

    for (const tag of tags) {
      const result = this.agent.execute(tag.kind, tag.name, tag.value);
      if (result) (result.ok ? confirmations : failures).push(result.message);
    }

    // The model's own text wins; a failed action is always reported so the reply can't claim a
    // change that did not happen.
    const lines = [text || confirmations.join(' '), ...failures].filter(Boolean);
    return lines.length ? lines.join('\n') : reply.trim();
  }
}

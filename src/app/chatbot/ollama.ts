import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { AgentPromptService } from '../agent/agent-prompt.service';
import { DEFAULT_BASE_URL, DEFAULT_MODEL, OLLAMA_HOSTS, PROBE_TIMEOUT_MS } from './ollama-hosts';

interface OllamaTagsResponse {
  models: { name: string }[];
}

interface OllamaChatResponse {
  message: { content: string };
}

export type ConnectionStatus = 'unknown' | 'connecting' | 'online' | 'offline';

const BASE_URL_STORAGE_KEY = 'ibticare.ollama.baseUrl';
const MODEL_STORAGE_KEY = 'ibticare.ollama.model';

@Injectable({ providedIn: 'root' })
export class OllamaService {
  private readonly prompt = inject(AgentPromptService);

  /** Where Ollama listens. Set automatically by discovery, or manually on the Settings page. */
  readonly baseUrl = signal(readStored(BASE_URL_STORAGE_KEY) ?? DEFAULT_BASE_URL);
  readonly selectedModel = signal(readStored(MODEL_STORAGE_KEY) ?? DEFAULT_MODEL);
  readonly status = signal<ConnectionStatus>('unknown');
  readonly models = signal<readonly string[]>([]);
  readonly isOnline = computed(() => this.status() === 'online');

  /** True when a server was picked before; discovery then starts from that one. */
  private readonly hasSavedUrl = readStored(BASE_URL_STORAGE_KEY) !== null;

  constructor() {
    effect(() => writeStored(BASE_URL_STORAGE_KEY, this.baseUrl()));
    effect(() => writeStored(MODEL_STORAGE_KEY, this.selectedModel()));
  }

  /** Every host discovery will try, the saved server first. */
  candidates(): string[] {
    const saved = this.baseUrl();
    return this.hasSavedUrl && !OLLAMA_HOSTS.includes(saved)
      ? [saved, ...OLLAMA_HOSTS]
      : [...OLLAMA_HOSTS];
  }

  /**
   * Connects to the current server, falling back to discovery across {@link OLLAMA_HOSTS}.
   * Runs at startup so a fresh checkout on another device finds the tailnet host on its own.
   */
  async ensureConnected(): Promise<boolean> {
    const saved = this.baseUrl();
    this.status.set('connecting');

    const models = await this.probe(saved);
    if (models) {
      this.applyConnection(saved, models);
      return true;
    }
    return this.discover(this.candidates().filter((url) => url !== saved));
  }

  /** Probes every candidate at once and connects to the first one in preference order. */
  async discover(candidates: readonly string[] = this.candidates()): Promise<boolean> {
    this.status.set('connecting');

    const results = await Promise.all(candidates.map((url) => this.probe(url)));
    const index = results.findIndex((models) => models !== null);
    if (index === -1) {
      this.status.set('offline');
      this.models.set([]);
      return false;
    }

    this.applyConnection(candidates[index], results[index]!);
    return true;
  }

  /** Connects to one specific server, e.g. a URL typed on the Settings page. */
  async connectTo(baseUrl: string): Promise<boolean> {
    const url = normalizeUrl(baseUrl);
    this.baseUrl.set(url);
    this.status.set('connecting');

    const models = await this.probe(url);
    if (!models) {
      this.status.set('offline');
      this.models.set([]);
      return false;
    }

    this.applyConnection(url, models);
    return true;
  }

  async chat(prompt: string): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl()}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.selectedModel(),
          messages: [
            { role: 'system', content: this.prompt.build() },
            { role: 'user', content: prompt },
          ],
          stream: false,
        }),
      });

      if (!response.ok) return `Error ${response.status}: ${response.statusText}`;
      const data = (await response.json()) as OllamaChatResponse;
      this.status.set('online');
      return data.message.content;
    } catch (error: unknown) {
      this.status.set('offline');
      const reason = error instanceof Error ? error.message : String(error);
      return [
        `Connection failed: I can't reach Ollama at ${this.baseUrl()} (${reason}).`,
        'Check that the server is running and that the URL on the Settings page is reachable from this device.',
      ].join(' ');
    }
  }

  /** Returns the server's model names, or null when it can't be reached. */
  private async probe(baseUrl: string): Promise<string[] | null> {
    try {
      const res = await fetch(`${baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as OllamaTagsResponse;
      return data.models.map((m) => m.name);
    } catch {
      return null;
    }
  }

  private applyConnection(baseUrl: string, models: readonly string[]): void {
    this.baseUrl.set(baseUrl);
    this.models.set(models);
    this.status.set('online');
    // Keep the selection on a model this server actually has.
    if (models.length && !models.includes(this.selectedModel())) {
      this.selectedModel.set(models[0]);
    }
  }
}

/** Trims whitespace, adds a scheme if it was left out, and drops a trailing slash. */
function normalizeUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, '');
  return /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
}

function readStored(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    // Storage is unavailable (SSR, private mode); fall back to the defaults for this session.
    return null;
  }
}

function writeStored(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Nothing to do; the value still applies for this session.
  }
}

import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { ActionRegistryService } from '../services/action-registry.service';
import { ScreenContextService } from '../services/screen-context.service';
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
  private readonly screenContext = inject(ScreenContextService);
  private readonly actions = inject(ActionRegistryService);

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
            { role: 'system', content: this.buildSystemPrompt() },
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

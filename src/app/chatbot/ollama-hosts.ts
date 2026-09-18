/**
 * Where to look for Ollama, in preference order.
 *
 * On startup the app probes these in parallel and connects to the first one in this list that
 * answers, so the same checkout works on the machine running Ollama and on any other device on
 * the tailnet. A server picked manually on the Settings page overrides this and is remembered.
 *
 * To point at a different host, edit this list — the Tailscale entries below are the `desktop-ai`
 * node. The short name needs MagicDNS; the IP works either way.
 */
export const OLLAMA_HOSTS: readonly string[] = [
  'http://127.0.0.1:11434',
  'http://desktop-ai:11434',
  'http://desktop-ai.tail1d4aef.ts.net:11434',
  'http://100.102.45.66:11434',
];

export const DEFAULT_BASE_URL = OLLAMA_HOSTS[0];
export const DEFAULT_MODEL = 'qwen2.5-coder:1.5b';

/** How long a reachability probe may take. Short, so an offline host doesn't stall startup. */
export const PROBE_TIMEOUT_MS = 2500;

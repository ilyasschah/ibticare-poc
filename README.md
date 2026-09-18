# ibticare-poc

A proof of concept for a **screen-aware desktop assistant**: an Angular app wrapped in Electron, with a
floating chat widget backed by a local [Ollama](https://ollama.com) model. The assistant can see what page
you are on and what data is on it, and can act on the app — navigate, switch the theme, and edit your profile.

## How it works

| Piece           | File                                          | Role                                                                             |
| --------------- | --------------------------------------------- | -------------------------------------------------------------------------------- |
| Screen context  | `src/app/services/screen-context.service.ts`  | Tracks route, page title and the metrics each page publishes                     |
| Action registry | `src/app/services/action-registry.service.ts` | Runs `[ACTION:…]` tags (dark mode, profile edits) and reports success or failure |
| Tag parser      | `src/app/chatbot/agent-tags.ts`               | Pulls `[NAV:…]` / `[ACTION:…]` tags out of a model reply                         |
| Ollama client   | `src/app/chatbot/ollama.ts`                   | Builds the system prompt and calls `/api/chat`                                   |
| Chat widget     | `src/app/chatbot/chatbot.ts`                  | Renders the conversation and applies the tags                                    |

Each page publishes **pre-computed, pre-formatted** metrics (see `Dashboard`) so small models never have to do
arithmetic, and the system prompt forbids answering with anything not in that data.

## Requirements

- Node.js 20+
- Ollama, with at least one model pulled (`ollama pull qwen2.5-coder:1.5b`)

## Running

```bash
npm install
npm start          # Angular dev server on http://localhost:4200
```

For the Electron window (starts the dev server and waits for it):

```bash
npm run electron
```

Other scripts: `npm run build` (production build + SSR prerender), `npm test` (Vitest).

## Using Ollama on another machine (Tailscale)

The app does not need to run on the machine hosting Ollama. At startup it probes every host in
[`src/app/chatbot/ollama-hosts.ts`](src/app/chatbot/ollama-hosts.ts) in parallel and connects to the
first one in that list that answers, so the same checkout works on the Ollama host and on any other
device in the tailnet with no configuration.

The list is ordered local-first:

```
http://127.0.0.1:11434                        Ollama on this machine
http://desktop-ai:11434                       tailnet host via MagicDNS short name
http://desktop-ai.tail1d4aef.ts.net:11434     same host, fully qualified
http://100.102.45.66:11434                    same host by tailnet IP, if MagicDNS is off
```

Edit that file to point at a different host. The **Settings** page overrides it: **Connect** uses the
URL you type, **Detect** re-scans every known host, and the chosen server and model are saved to
`localStorage` so they survive a restart. A probe gives up after 2.5s, so an offline host never
stalls startup.

### Requirements on the machine running Ollama

1. Bind it beyond loopback — set `OLLAMA_HOST=0.0.0.0:11434` and restart Ollama.
2. Allow inbound TCP 11434 from the tailnet range `100.64.0.0/10` (and `fd7a:115c:a1e0::/48` for
   IPv6). Scope the firewall rule to that range; do not open the port to the whole network.
3. Leave `OLLAMA_ORIGINS` alone. Ollama already allows `localhost` and `file://` origins, which
   covers both the dev server and a packaged Electron window.

MagicDNS must be enabled tailnet-wide for the short and fully-qualified names to resolve on other
devices; the tailnet IP entry works either way.

> **Ollama has no authentication.** Anything that can reach port 11434 can use your models. Keep the
> firewall rule scoped to the tailnet, and never expose it through Tailscale Funnel or a port forward.

## Conventions

`.claude/CLAUDE.md` (mirrored to `.gemini/GEMINI.md` and `.github/copilot-instructions.md`) is the style
guide for this repo: standalone components, signals, `inject()`, `input()`/`output()`, OnPush, reactive
forms, native control flow, no `any`, and WCAG AA.

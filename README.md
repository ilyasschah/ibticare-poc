# ibticare-poc

A proof of concept for a **screen-aware desktop assistant**: an Angular app wrapped in Electron, with a
floating chat widget backed by a local [Ollama](https://ollama.com) model. The assistant can see what page
you are on and what data is on it, and can act on the app — navigate, switch the theme, and edit your profile.

## Architecture

The assistant is not wired to any screen. Three layers keep it that way:

```
  Domains (own the data and the rules)
    UserProfileService   TransactionsService   ThemeService   OllamaService
                              |
  Adapters (one file per domain, the only place that knows the agent exists)
    profile.agent.ts    dashboard.agent.ts    settings.agent.ts    navigation.agent.ts
                              |  register(context) / register(action)
  Agent runtime (generic — knows nothing about profiles or transactions)
    AgentContextService  ......  what the assistant can READ
    AgentActionService   ......  what the assistant can DO
    AgentPromptService   ......  renders both into the system prompt
    agent-tags.ts        ......  parses the model's reply back into actions
```

**Every domain registers once at startup**, in `provideAgent()` — not when its page is visited.
That single decision is what lets the user ask "who is my best customer?" from the Profile page, or
"what is my user name?" from Settings. The current route is tracked separately and only tells the
model where the user is looking; it never limits what can be answered.

**The prompt is generated, never hand-written.** `AgentPromptService` walks the two registries, so
registering an action automatically teaches the model the tag, its meaning and its parameter. Adding
a capability is one adapter file and one line in `provideAgent()` — the prompt builder, the chat
widget and the dispatcher all pick it up untouched.

**Actions report the truth.** Every action returns `{ ok, message }`. If the model claims "I updated
your email" but validation rejected the value, the failure is appended to the reply, so the
assistant can never announce a change that did not happen.

**The tag protocol is contained.** `AgentPromptService` and `agent-tags.ts` are the only files that
know the model speaks in `[NAV:…]` / `[ACTION:…]`. Moving to native tool calling would mean
rewriting those two; no domain would change.

### Adding a capability

```ts
// src/app/agent/domains/billing.agent.ts
export function registerBillingDomain(): void {
  const context = inject(AgentContextService);
  const billing = inject(BillingService);

  context.register({
    id: 'billing',
    description: 'Outstanding invoices and their due dates.',
    snapshot: () => ({ overdue: billing.overdueCount(), total: formatUsd(billing.total()) }),
    examples: () => [
      { question: 'how much is overdue?', answer: `${formatUsd(billing.total())}.` },
    ],
  });
}
```

Add `registerBillingDomain()` to `provideAgent()` and the assistant can answer billing questions
from every screen.

### Two details that make a 1.5B model usable

- **Pre-computed, pre-formatted data.** `summarizeTransactions` does the arithmetic and `formatUsd`
  does the formatting, so the model quotes `$15,700.00` instead of adding a column up and getting it
  wrong.
- **Worked examples, generated from live data.** Each domain supplies its own question/answer pairs,
  rendered at the end of the prompt. Small models imitate the last thing they read far more reliably
  than they follow a written rule — before this, `qwen2.5-coder:1.5b` answered "what is my user
  name?" by trying to navigate to the Profile page.

Tag parsing is deliberately lenient for the same reason: a bare `[PROFILE]` is resolved by name, and
anything bracket-shaped that resolves to nothing is stripped rather than shown to the user.

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

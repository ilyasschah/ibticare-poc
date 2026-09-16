# ibticare-poc — Planning

## Current State (as of 2026-09-16, commit `3f7974f`)

**Stack:** Angular (standalone components) wrapped in Electron (`main.js`, 33 lines — creates a `BrowserWindow` only; no IPC). Local LLM via Ollama.

### `src/app/chatbot/ollama.ts` — `OllamaService` (`providedIn: 'root'`)
- Public mutable fields `baseUrl = 'http://127.0.0.1:11434'` and `selectedModel = 'qwen2.5-coder:1.5b'`.
- `ping()` → `GET /`; `getModels()` → `GET /api/tags` (uses `any`).
- `chat(prompt, currentRoute)` → `POST /api/chat` (`stream: false`), one system prompt plus one user message (no history kept).
  System prompt includes the current route and nav tags `[NAV:SETTINGS]`, `[NAV:PROFILE]`, `[NAV:DASHBOARD]`.

### `src/app/chatbot/chatbot.ts` — `Chatbot` component
- Uses decorator-style code (`@ViewChild`, `standalone: true`, `CommonModule`, `ChangeDetectorRef.detectChanges()`), plain arrays/booleans instead of signals.
- `isOpen` toggle, `messages[]`, auto-scroll in `ngAfterViewChecked`.
- `sendMessage()` pushes a "Thinking..." message, calls `ollama.chat(text, router.url)`, parses `[NAV:*]` with an `if/else` chain, strips the tag, falls back to "Navigating there now!".
- Styles in `chatbot.css` (111 lines, floating widget).

### `src/app/settings/settings.ts` — `Settings` component
- Template-driven (`FormsModule`) form for the Ollama URL and model. `testConnection()` pings and loads models; `onModelChange()` writes the model back to the service.

### `src/styles.css`
- Empty (only the default comment). No theme support.

### Missing
- There is no `src/app/services/` folder, no screen-context awareness beyond the route, no dark mode, and no action system besides navigation.

---

## Next Session: Implementation Plan

> Follow `.claude/CLAUDE.md`: signals, `inject()`, `providedIn: 'root'`, no `any`, and no `standalone: true` in new code.

### Phase A: Screen Context Engine

**A1. Create `src/app/services/screen-context.service.ts`**
```ts
export type ScreenMetrics = Record<string, string | number>;
export interface ScreenContext { pageTitle: string; route: string; metrics: ScreenMetrics; }

@Injectable({ providedIn: 'root' })
export class ScreenContextService {
  private router = inject(Router);
  private readonly _pageTitle = signal('');
  private readonly _route = signal('');
  private readonly _metrics = signal<ScreenMetrics>({});
  readonly context = computed<ScreenContext>(() => ({
    pageTitle: this._pageTitle(), route: this._route(), metrics: this._metrics(),
  }));
  // constructor: subscribe to router.events (NavigationEnd) → set route to e.urlAfterRedirects,
  //   clear metrics, and set the default pageTitle from the route's `title` data (or derive it from the path).
  setPageTitle(title: string): void
  setMetrics(metrics: ScreenMetrics): void   // replace
  updateMetrics(partial: ScreenMetrics): void // merge with update()
  clear(): void
}
```
- Pages (e.g. Dashboard) call `setPageTitle('Dashboard')` and `setMetrics({ balance: '$54,200', activeUsers: 120 })` in their constructor or after data loads.
- Clear the metrics on navigation so values from one page don't show up on the next page.

**A2. Update `OllamaService.chat()`**
- `private screenContext = inject(ScreenContextService);`
- Change the signature to `chat(prompt: string): Promise<string>` and read `this.screenContext.context()` inside. Update the caller in `chatbot.ts` and `ollama.spec.ts`. You can keep the route parameter as optional for backwards compatibility if needed.
- System prompt additions:
  ```
  CURRENT SCREEN:
  - Page title: "${ctx.pageTitle}"
  - Route: "${ctx.route}"
  - Visible data (JSON): ${JSON.stringify(ctx.metrics)}
  RULE: When the user asks about data (e.g. "How much money do I have?"), answer ONLY from Visible data.
  If the value is not present, say you cannot see it on this screen. Never invent numbers.
  ```
- While in there, replace `any` in `getModels()` and the `catch` with typed interfaces or `unknown`.

### Phase B: Global Action Registry and Dark Mode

**B1. Create `src/app/services/action-registry.service.ts`**
```ts
@Injectable({ providedIn: 'root' })
export class ActionRegistryService {
  private document = inject(DOCUMENT);
  readonly isDarkMode = signal<boolean>(false);
  constructor() {
    effect(() => this.document.body.classList.toggle('dark-theme', this.isDarkMode()));
  }
  toggleDarkMode(force?: boolean): void {
    this.isDarkMode.update(v => force ?? !v);
  }
  /** Returns true if the tag was handled. */
  execute(action: string): boolean {
    switch (action) {
      case 'DARK_MODE_ON': this.toggleDarkMode(true); return true;
      case 'DARK_MODE_OFF': this.toggleDarkMode(false); return true;
      default: return false;
    }
  }
}
```
- Optional: save the setting to `localStorage` (inside try/catch) and load it at startup.
- Use `DOCUMENT` from `@angular/common` instead of the `document` global.

**B2. Update `src/styles.css` with dark theme rules**
- Define CSS variables on `:root` (`--bg`, `--text`, `--surface`, `--border`, `--accent`, `--chat-bg`, `--chat-user-bubble`, `--chat-bot-bubble`) and override them in `body.dark-theme`.
- `body { background: var(--bg); color: var(--text); transition: background-color .2s, color .2s; }`
- Dark theme colors: background `#121212`, surface `#1e1e1e`, text `#e6e6e6`, border `#333`. Check that text contrast meets WCAG AA (at least 4.5:1).
- Update `chatbot.css` to use these variables for the floating container, header, bubbles, input and toggle button. Alternatively, add `.dark-theme app-chatbot .<container>` overrides in `styles.css`. Look up the real class names in `chatbot.html` first.
- Style inputs, selects and buttons in the settings page for dark mode.

**B3. Update the `OllamaService` system prompt**
```
3. ONLY output an action tag if the user explicitly asks to change the theme:
   - Enable dark mode: [ACTION:DARK_MODE_ON]
   - Disable dark mode / light mode: [ACTION:DARK_MODE_OFF]
   Always include a short friendly confirmation with the tag.
```
- Optionally include the current theme in the context (`Dark mode is currently ON/OFF`) by injecting `ActionRegistryService`.

**B4. Update `Chatbot` (`src/app/chatbot/chatbot.ts`) to parse tags**
- `private actions = inject(ActionRegistryService);`
- Replace the `if/else` chain with a generic parser:
  ```ts
  const NAV_ROUTES: Record<string, string> = { SETTINGS: '/settings', PROFILE: '/profile', DASHBOARD: '/dashboard' };
  const TAG_RE = /\[(NAV|ACTION):([A-Z_]+)\]/g;
  for (const [, kind, name] of reply.matchAll(TAG_RE)) {
    if (kind === 'NAV' && NAV_ROUTES[name]) this.router.navigate([NAV_ROUTES[name]]);
    if (kind === 'ACTION') this.actions.execute(name);
  }
  reply = reply.replace(TAG_RE, '').trim() || 'Done!';
  ```
- The fallback message depends on the tag type: "Navigating there now!" for navigation and "Theme updated!" for actions.

### Optional cleanup (if time allows, matching CLAUDE.md)
- Convert `Chatbot` state to signals (`isOpen`, `messages`), switch to `viewChild()` and `OnPush`, remove `CommonModule`/`standalone: true`, and drop `detectChanges()`.
- Convert `Settings` to Reactive Forms and signals.

### Verification
1. `ng build` succeeds; `ng test` passes (update `ollama.spec.ts` and `chatbot.spec.ts` with a mock `ScreenContextService` and `ActionRegistryService`).
2. On Dashboard with metrics set, ask "How much money do I have?" → the answer is `$54,200`.
3. Ask "turn on dark mode" → `body.dark-theme` is applied, the chatbot is restyled, and the tag is stripped from the message. Ask "switch to light mode" → the class is removed.
4. Navigation tags still work, and a reply containing both a NAV and an ACTION tag runs both.
5. AXE check and contrast check in both themes.

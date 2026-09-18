/**
 * The contracts between the application's domains and the assistant.
 *
 * A domain (profile, dashboard, settings, …) exposes two things: a {@link ContextProvider} so the
 * assistant can read it, and zero or more {@link AgentAction}s so the assistant can change it.
 * Nothing here knows about Ollama or about prompts — the agent runtime turns these registrations
 * into whatever the model needs, so the transport can change without touching a domain.
 */

export type AgentValue =
  string | number | boolean | null | AgentValue[] | { [key: string]: AgentValue };

export type AgentData = Record<string, AgentValue>;

/** A worked question/answer pair, shown to the model so it learns to answer rather than act. */
export interface AgentExample {
  readonly question: string;
  readonly answer: string;
}

/** A slice of application state the assistant can read from any screen. */
export interface ContextProvider {
  /** Stable key this domain appears under in the snapshot, e.g. `profile`. */
  readonly id: string;
  /** One line telling the model what lives in this slice. */
  readonly description: string;
  /**
   * The current values. Called once per request, so keep it cheap, and pre-format numbers and
   * money — small models are far better at quoting a string than at doing arithmetic.
   */
  snapshot(): AgentData;
  /**
   * One or two questions this domain typically gets, answered from the live snapshot. Small models
   * copy the shape of an example far more reliably than they follow a written instruction.
   */
  examples?(): readonly AgentExample[];
}

/** The outcome of an action, reported back to the user verbatim. */
export interface ActionResult {
  readonly ok: boolean;
  /** Confirmation on success, the reason on failure. */
  readonly message: string;
}

/** The two tag families the model emits. Navigation is separated so the prompt can group it. */
export type AgentTagKind = 'NAV' | 'ACTION';

/** Something the assistant can do on the user's behalf. */
export interface AgentAction {
  readonly kind: AgentTagKind;
  /** Tag name, e.g. `UPDATE_NAME`. Uppercase with underscores. */
  readonly name: string;
  /** What it does, and when the model should reach for it. */
  readonly description: string;
  /** Describes the value after the second colon. Omit for actions that take no value. */
  readonly parameter?: string;
  /** A complete tag, shown to the model as an example. */
  readonly example: string;
  run(value?: string): ActionResult;
}

/** Where the user currently is. */
export interface ScreenInfo {
  readonly route: string;
  readonly title: string;
  /** The domain this screen displays, when it maps to one. */
  readonly domain?: string;
}

/** Everything the assistant is given about the application on one request. */
export interface AgentSnapshot {
  readonly screen: ScreenInfo;
  /** Keyed by {@link ContextProvider.id}. */
  readonly data: Record<string, AgentData>;
}

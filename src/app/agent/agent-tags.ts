import { AgentTagKind } from './agent.types';

export interface AgentTag {
  /** Absent when the model omitted the prefix and wrote `[PROFILE]` instead of `[NAV:PROFILE]`. */
  kind?: AgentTagKind;
  name: string;
  value?: string;
}

export interface ParsedReply {
  text: string;
  tags: AgentTag[];
}

/**
 * `[NAV:NAME]`, `[ACTION:NAME]`, `[ACTION:NAME:value]` — and the same without the prefix.
 *
 * The prefix is optional on purpose. Small models drop it often, and a bare `[PROFILE]` is an
 * unmistakable intent; the registry resolves it by name. Anything that matches but resolves to
 * nothing is still removed from the text, so malformed tags never reach the user.
 */
const TAG_PATTERN = /\[(?:(NAV|ACTION):)?([A-Z][A-Z0-9_]*)(?::([^\]\n]*))?\]/g;

/** Extracts agent tags from a model reply and returns the remaining text. */
export function parseAgentTags(reply: string): ParsedReply {
  const tags: AgentTag[] = [];
  for (const [, kind, name, rawValue] of reply.matchAll(TAG_PATTERN)) {
    const value = rawValue?.trim().replace(/^["']|["']$/g, '');
    tags.push({
      ...(kind ? { kind: kind as AgentTagKind } : {}),
      name,
      ...(value ? { value } : {}),
    });
  }
  const text = reply
    .replace(TAG_PATTERN, '')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
  return { text, tags };
}

export type AgentTag =
  | { kind: 'NAV'; name: string; value?: string }
  | { kind: 'ACTION'; name: string; value?: string };

export interface ParsedReply {
  text: string;
  tags: AgentTag[];
}

/** `[NAV:NAME]`, `[ACTION:NAME]` or `[ACTION:NAME:value]`. The value runs up to the closing bracket. */
const TAG_PATTERN = /\[(NAV|ACTION):([A-Z_]+)(?::([^\]\n]*))?\]/g;

/** Extracts agent tags from a model reply and returns the remaining text. */
export function parseAgentTags(reply: string): ParsedReply {
  const tags: AgentTag[] = [];
  for (const [, kind, name, rawValue] of reply.matchAll(TAG_PATTERN)) {
    const value = rawValue?.trim().replace(/^["']|["']$/g, '');
    tags.push(value ? { kind: kind as AgentTag['kind'], name, value } : { kind: kind as AgentTag['kind'], name });
  }
  const text = reply.replace(TAG_PATTERN, '').replace(/[ \t]{2,}/g, ' ').trim();
  return { text, tags };
}

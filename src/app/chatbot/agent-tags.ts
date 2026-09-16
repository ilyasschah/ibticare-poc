export type AgentTag =
  | { kind: 'NAV'; name: string }
  | { kind: 'ACTION'; name: string };

export interface ParsedReply {
  text: string;
  tags: AgentTag[];
}

const TAG_PATTERN = /\[(NAV|ACTION):([A-Z_]+)\]/g;

/** Extracts `[NAV:...]` and `[ACTION:...]` tags from a model reply and returns the remaining text. */
export function parseAgentTags(reply: string): ParsedReply {
  const tags: AgentTag[] = [];
  for (const [, kind, name] of reply.matchAll(TAG_PATTERN)) {
    tags.push({ kind: kind as AgentTag['kind'], name });
  }
  const text = reply.replace(TAG_PATTERN, '').replace(/[ \t]{2,}/g, ' ').trim();
  return { text, tags };
}

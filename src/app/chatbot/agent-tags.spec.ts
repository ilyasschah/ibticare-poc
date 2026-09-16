import { parseAgentTags } from './agent-tags';

describe('parseAgentTags', () => {
  it('returns plain text unchanged with no tags', () => {
    expect(parseAgentTags('You are on the dashboard.')).toEqual({ text: 'You are on the dashboard.', tags: [] });
  });

  it('extracts NAV and ACTION tags and strips them from the text', () => {
    const result = parseAgentTags('Sure! [NAV:SETTINGS] Switching to dark mode [ACTION:DARK_MODE_ON]');
    expect(result.tags).toEqual([
      { kind: 'NAV', name: 'SETTINGS' },
      { kind: 'ACTION', name: 'DARK_MODE_ON' },
    ]);
    expect(result.text).toBe('Sure! Switching to dark mode');
  });

  it('returns empty text when the reply is only a tag', () => {
    expect(parseAgentTags('[ACTION:DARK_MODE_OFF]')).toEqual({
      text: '',
      tags: [{ kind: 'ACTION', name: 'DARK_MODE_OFF' }],
    });
  });
});

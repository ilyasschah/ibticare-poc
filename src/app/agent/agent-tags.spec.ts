import { parseAgentTags } from './agent-tags';

describe('parseAgentTags', () => {
  it('returns plain text unchanged with no tags', () => {
    expect(parseAgentTags('You are on the dashboard.')).toEqual({
      text: 'You are on the dashboard.',
      tags: [],
    });
  });

  it('extracts NAV and ACTION tags and strips them from the text', () => {
    const result = parseAgentTags(
      'Sure! [NAV:SETTINGS] Switching to dark mode [ACTION:DARK_MODE_ON]',
    );
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

  it('extracts tag values containing spaces, dots and @', () => {
    const result = parseAgentTags(
      'Done! [ACTION:UPDATE_NAME:Sarah Connor] [ACTION:UPDATE_EMAIL:sarah.connor@sky.net]',
    );
    expect(result.tags).toEqual([
      { kind: 'ACTION', name: 'UPDATE_NAME', value: 'Sarah Connor' },
      { kind: 'ACTION', name: 'UPDATE_EMAIL', value: 'sarah.connor@sky.net' },
    ]);
    expect(result.text).toBe('Done!');
  });

  it('trims whitespace and surrounding quotes from values', () => {
    expect(parseAgentTags('[ACTION:UPDATE_NAME: "Sarah Connor" ]').tags).toEqual([
      { kind: 'ACTION', name: 'UPDATE_NAME', value: 'Sarah Connor' },
    ]);
  });

  it('accepts a tag whose prefix the model dropped, so it can be resolved by name', () => {
    // Small models emit `[PROFILE]` for `[NAV:PROFILE]` often enough to be worth handling.
    expect(parseAgentTags('Taking you there. [PROFILE]')).toEqual({
      text: 'Taking you there.',
      tags: [{ name: 'PROFILE' }],
    });
  });

  it('strips a bracketed token even when nothing will resolve it', () => {
    // Whatever the model meant, the user must never see the raw brackets.
    expect(parseAgentTags('All done. [SOMETHING_ELSE]').text).toBe('All done.');
  });

  it('leaves ordinary prose in brackets that is clearly not a tag', () => {
    expect(parseAgentTags('Your balance [see dashboard] is fine.').text).toBe(
      'Your balance [see dashboard] is fine.',
    );
  });
});

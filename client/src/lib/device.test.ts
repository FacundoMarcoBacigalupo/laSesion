import { describe, expect, it } from 'vitest';
import { describeDevice } from './device';

describe('describeDevice', () => {
  it('identifies iPhones when the browser hides the exact model', () => {
    expect(describeDevice('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)'))
      .toEqual({ model: 'iPhone', platform: 'iOS' });
  });

  it('classifies modern reduced Android user agents as mobile devices', () => {
    expect(describeDevice('Mozilla/5.0 (Linux; Android 10; K)', 'Android', undefined, true))
      .toEqual({ model: 'Android (móvil)', platform: 'Android' });
  });

  it('classifies Android tablets separately', () => {
    expect(describeDevice('Mozilla/5.0 (Linux; Android 13; Tablet)', 'Android', undefined, false))
      .toEqual({ model: 'Android (tablet)', platform: 'Android' });
  });

  it('recognizes iPadOS desktop user agents when touch is available', () => {
    expect(describeDevice('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)', undefined, undefined, undefined, true))
      .toEqual({ model: 'iPad', platform: 'iOS' });
  });

  it('falls back to a desktop platform when the browser exposes no model', () => {
    expect(describeDevice('Mozilla/5.0 (Windows NT 10.0; Win64; x64)'))
      .toEqual({ model: 'PC Windows', platform: 'Windows' });
  });
});

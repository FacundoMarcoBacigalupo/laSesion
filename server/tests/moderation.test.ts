import { describe, it, expect } from 'vitest';
import { moderateText } from '../src/services/moderation';

describe('moderation', () => {
  it('trims and collapses', () => {
    expect(moderateText('  hola   mundo  ').text).toBe('hola mundo');
  });
  it('rejects url', () => {
    expect(moderateText('visita http://x.com').ok).toBe(false);
  });
  it('strips html', () => {
    expect(moderateText('<b>x</b>').text).toBe('x');
  });
  it('limits length', () => {
    const long = 'a'.repeat(100);
    expect(moderateText(long).text.length).toBeLessThanOrEqual(80);
  });
});
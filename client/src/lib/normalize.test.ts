import { describe, it, expect } from 'vitest';
import { nrm } from './normalize';

describe('normalize', () => {
  it('removes accents', () => {
    expect(nrm('á')).toBe('A');
    expect(nrm('ñ')).toBe('N');
  });
  it('uppercases', () => {
    expect(nrm('a')).toBe('A');
  });
});
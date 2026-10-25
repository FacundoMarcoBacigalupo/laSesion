import { describe, it, expect } from 'vitest';
import { validatePng } from '../src/domain/pact';

describe('pact png', () => {
  it('validates prefix and size', () => {
    const small = 'data:image/png;base64,' + Buffer.from('a'.repeat(100)).toString('base64');
    expect(validatePng(small)).toBe(true);
    expect(validatePng('data:image/jpeg;base64,abc')).toBe(false);
    const big = 'data:image/png;base64,' + 'A'.repeat(300000);
    expect(validatePng(big)).toBe(false);
  });
});
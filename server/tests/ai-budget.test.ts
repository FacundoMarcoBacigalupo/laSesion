import { describe, expect, it } from 'vitest';
import { spendsModel } from '../src/ai/budget';

describe('AI call budget', () => {
  it('spends the model only on lines that are not already written', () => {
    expect(spendsModel('responder_pregunta', 0, 15)).toBe(true);
    expect(spendsModel('pacto', 14, 15)).toBe(true);
    expect(spendsModel('latido', 0, 15)).toBe(false);
    expect(spendsModel('fantasma', 0, 15)).toBe(false);
    expect(spendsModel('ofrenda', 0, 15)).toBe(false);
    expect(spendsModel('exorcismo_fin', 0, 15)).toBe(false);
  });

  it('stops at the demo cap and frees again when the count resets', () => {
    expect(spendsModel('responder_pregunta', 15, 15)).toBe(false);
    expect(spendsModel('responder_pregunta', 0, 15)).toBe(true);
  });
});
